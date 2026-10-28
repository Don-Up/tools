"""
alert.py — 用系统级弹窗提醒用户(任务完成 / 需要确认 / 求助)

Usage:
    python alert.py done                     # 任务完成
    python alert.py attention                # 需要确认
    python alert.py attention "要继续吗?"     # 需要确认 + 自定义正文
    python alert.py help                     # 求助
    python alert.py info "自定义提示"          # 普通信息
    python alert.py error "构建失败" --title "构建"  # 错误

Options:
    --title TEXT   覆盖弹窗标题
    --wait         阻塞等待用户关闭弹窗(默认后台弹出,不阻塞调用方)
    --sound        弹窗的同时播放对应提示音(复用 notify.py)

正文前缀:
    弹窗正文一律以 "[export]" 开头(无论用预设文案还是自定义文案),
    方便用户一眼认出这是本项目发出来的提醒。

Exit code: 0 = 弹窗已发出, 1 = 参数错, 2 = 弹窗完全无法发出(已降级为终端输出)

跨平台:
- Windows: ctypes 调用 user32.MessageBoxW,系统原生模态弹窗,无需额外依赖
- macOS:   osascript 调 System Events 的 display dialog
- Linux:   zenity(优先) / notify-send(降级)
- 全部失败: 终端输出 + BEL 字符兜底

Claude Code 调用时机:
- 完成一个独立任务后 → python alert.py done
- 准备 AskUserQuestion / 询问用户确认前 → python alert.py attention
- 长流程被阻塞需要用户介入时 → python alert.py help
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

IS_WINDOWS = os.name == "nt"
IS_MAC = sys.platform == "darwin"

# 弹窗正文前缀:所有提醒(预设文案与自定义文案)都加上,方便用户认出来源
MESSAGE_PREFIX = "[export] "

# 各类提醒的默认标题与正文
PRESETS: dict[str, tuple[str, str]] = {
    "done": ("任务完成", "✅ 事情做完了,可以回来看结果了。"),
    "attention": ("需要确认", "❗ 请回来看一眼,这里需要你做一个选择。"),
    "help": ("需要帮助", "🆘 卡住了,需要你介入处理一下。"),
    "info": ("提示", "ℹ️ 有一条提示信息。"),
    "error": ("出错了", "❌ 执行过程中出现错误。"),
}


def _default_text(command: str) -> str:
    """返回某个提醒命令的默认正文。

    :param command: 提醒命令名(done / attention / help / info / error)。
    :return: 对应的默认正文文案,未知命令返回空字符串。
    """
    preset = PRESETS.get(command)
    return preset[1] if preset else ""


def _default_title(command: str) -> str:
    """返回某个提醒命令的默认标题。

    :param command: 提醒命令名。
    :return: 对应的默认标题文案,未知命令返回"提示"。
    """
    preset = PRESETS.get(command)
    return preset[0] if preset else "提示"


def _escape_applescript(text: str) -> str:
    """把普通文本转义成可以安全嵌入 AppleScript 字符串字面量的形式。

    :param text: 原始文本,可能包含引号与反斜杠。
    :return: 转义后的文本,可直接放进双引号里。
    """
    return text.replace("\\", "\\\\").replace('"', '\\"')


def show_windows(title: str, text: str, icon: str) -> bool:
    """在 Windows 上通过 user32.MessageBoxW 弹出系统级模态对话框。

    :param title: 弹窗标题栏文字。
    :param text: 弹窗正文文字。
    :param icon: 图标类型(information / question / error),决定弹窗的图标样式。
    :return: 弹窗是否成功发出。
    """
    try:
        import ctypes
        from ctypes import wintypes
    except ImportError:
        return False

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    user32.MessageBoxW.argtypes = [
        wintypes.HWND,
        wintypes.LPCWSTR,
        wintypes.LPCWSTR,
        wintypes.UINT,
    ]
    user32.MessageBoxW.restype = ctypes.c_int

    MB_OK = 0x00000000
    MB_ICONQUESTION = 0x00000020
    MB_ICONERROR = 0x00000010
    MB_ICONINFORMATION = 0x00000040
    MB_TOPMOST = 0x00040000
    MB_SETFOREGROUND = 0x00010000

    icon_flag = {
        "information": MB_ICONINFORMATION,
        "question": MB_ICONQUESTION,
        "error": MB_ICONERROR,
    }.get(icon, MB_ICONINFORMATION)

    flags = MB_OK | icon_flag | MB_TOPMOST | MB_SETFOREGROUND
    body = f"{text}\n\n(由 alert.py 弹出的系统级提示,点击确定关闭)"

    try:
        user32.MessageBoxW(None, body, title, flags)
    except Exception:
        return False
    return True


def show_mac(title: str, text: str, icon: str) -> bool:
    """在 macOS 上通过 osascript 弹出系统级对话框。

    :param title: 弹窗标题文字。
    :param text: 弹窗正文文字。
    :param icon: 图标类型,目前统一映射为"停止"图标(系统限制)。
    :return: 弹窗是否成功发出。
    """
    script = (
        f'display dialog "{_escape_applescript(text)}" '
        f'with title "{_escape_applescript(title)}" '
        f'buttons {{"好"}} default button "好" with icon stop'
    )
    try:
        subprocess.run(
            ["osascript", "-e", script],
            check=False,
            timeout=300,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return False


def show_linux(title: str, text: str, icon: str) -> bool:
    """在 Linux 上优先用 zenity 弹窗,失败降级为 notify-send 通知。

    :param title: 弹窗标题文字。
    :param text: 弹窗正文文字。
    :param icon: 图标类型(information / question / error),映射到 zenity 的模式。
    :return: 弹窗是否成功发出。
    """
    zenity_mode = {
        "information": "--info",
        "question": "--question",
        "error": "--error",
    }.get(icon, "--info")

    try:
        result = subprocess.run(
            ["zenity", zenity_mode, "--title", title, "--text", text],
            check=False,
            timeout=300,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode in (0, 1, 5):
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass

    # 降级:notify-send 发系统通知(不是模态弹窗,但至少有可见提示)
    try:
        subprocess.run(
            ["notify-send", title, text],
            check=False,
            timeout=5,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return False


def show_dialog(title: str, text: str, icon: str) -> bool:
    """按当前操作系统选择合适的系统级弹窗实现。

    :param title: 弹窗标题文字。
    :param text: 弹窗正文文字。
    :param icon: 图标类型(information / question / error)。
    :return: 弹窗是否成功发出。
    """
    if IS_WINDOWS:
        return show_windows(title, text, icon)
    if IS_MAC:
        return show_mac(title, text, icon)
    return show_linux(title, text, icon)


def spawn_detached(child_args: list[str]) -> bool:
    """派生一个脱离父进程的子进程来持有弹窗,使父进程可以立即返回。

    :param child_args: 子进程的命令行参数列表(不含解释器路径)。
    :return: 子进程是否成功派生。
    """
    popen_kwargs: dict = {
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
    }
    if IS_WINDOWS:
        # DETACHED_PROCESS 让子进程不随父进程退出而终止
        popen_kwargs["creationflags"] = (
            getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
            | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        )
    else:
        popen_kwargs["start_new_session"] = True

    try:
        subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), *child_args],
            **popen_kwargs,
        )
        return True
    except (FileNotFoundError, OSError):
        return False


def play_sound(command: str) -> None:
    """复用 notify.py 播放与提醒命令对应的提示音,失败时静默忽略。

    :param command: 提醒命令名(done / attention / help),用于选择音调。
    :return: 无返回值。
    """
    notify_path = Path(__file__).resolve().parent.parent / "notify" / "notify.py"
    if not notify_path.exists():
        return
    try:
        subprocess.run(
            [sys.executable, str(notify_path), command],
            check=False,
            timeout=10,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        pass


def fallback_print(title: str, text: str) -> None:
    """在所有系统弹窗方案都不可用时,把提醒内容打印到终端作为兜底。

    :param title: 弹窗标题文字。
    :param text: 弹窗正文文字。
    :return: 无返回值。
    """
    sys.stdout.write(f"\n[{title}] {text}\n")
    sys.stdout.write("\a")
    sys.stdout.flush()


def build_parser() -> argparse.ArgumentParser:
    """构造命令行参数解析器。

    :return: 配置好参数规则的 ArgumentParser 实例。
    """
    parser = argparse.ArgumentParser(
        prog="alert.py",
        description="用系统级弹窗提醒用户(任务完成 / 需要确认 / 求助)",
    )
    parser.add_argument(
        "command",
        choices=sorted(PRESETS.keys()),
        help="提醒类型",
    )
    parser.add_argument(
        "text",
        nargs="?",
        default=None,
        help="弹窗正文,省略时使用该类型的默认文案",
    )
    parser.add_argument("--title", default=None, help="弹窗标题,省略时使用默认标题")
    parser.add_argument(
        "--wait",
        action="store_true",
        help="阻塞等待用户关闭弹窗(默认后台弹出,不阻塞调用方)",
    )
    parser.add_argument(
        "--sound",
        action="store_true",
        help="弹窗的同时播放对应提示音",
    )
    return parser


def main() -> int:
    """解析命令行参数并弹出系统级提醒。

    弹窗正文一律加上 ``[export]`` 前缀(预设文案与自定义文案都加),
    让用户一眼看出这条提醒来自本项目。

    :return: 0 表示弹窗已发出,1 表示参数错误,2 表示弹窗完全无法发出。
    """
    parser = build_parser()
    args = parser.parse_args()

    title = args.title or _default_title(args.command)
    body = args.text if args.text is not None else _default_text(args.command)
    text = f"{MESSAGE_PREFIX}{body}"

    icon = {
        "done": "information",
        "info": "information",
        "attention": "question",
        "help": "error",
        "error": "error",
    }.get(args.command, "information")

    if args.sound:
        play_sound(args.command)

    if not args.wait:
        # 非阻塞:派生子进程去弹窗,本进程立即返回
        child_args = [args.command, "--wait"]
        if args.text is not None:
            child_args.append(args.text)
        if args.title is not None:
            child_args += ["--title", args.title]
        if spawn_detached(child_args):
            return 0
        # 派生失败:退回阻塞模式,至少让提醒可见
        if show_dialog(title, text, icon):
            return 0
        fallback_print(title, text)
        return 2

    if show_dialog(title, text, icon):
        return 0
    fallback_print(title, text)
    return 2


if __name__ == "__main__":
    sys.exit(main())
