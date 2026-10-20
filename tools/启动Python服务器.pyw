"""focus-dataflow 本地服务的图形化启动器(无控制台窗口)。

桌面上的「启动Python服务器.vbs」双击即可启动:该 vbs 用系统级
pyw.exe 拉起本文件(所以完全没有控制台窗口),本文件只弹一个 tkinter 小窗 ——
显示局域网地址,可随时启停服务。

如果 .vbs 丢了,命令行等价物:
    pyw tools/启动Python服务器.pyw
"""

import os
import socket
import sys
import threading
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent / 'launcher.log'

# pythonw.exe 下 sys.stdout / sys.stderr 是 None。
# http.server 的 log_message 会往 sys.stderr 写访问日志,一旦是 None 就抛
# AttributeError,请求处理中断 → 客户端收到 "Empty reply from server"。
# 这里补上真实的文件对象,顺带把异常和访问日志留在 launcher.log 里。
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w', encoding='utf-8')
if sys.stderr is None:
    sys.stderr = open(LOG_PATH, 'a', encoding='utf-8')

sys.path.insert(0, str(Path(__file__).resolve().parent))

import serve  # noqa: E402

HOST = '0.0.0.0'
PORT = 8000


def log(msg):
    """pythonw.exe 没有 stderr,异常会被静默吞掉,写到文件里。"""
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(f'{msg}\n')
    except OSError:
        pass


def local_ip():
    """取本机局域网 IP(不产生实际流量)。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


def port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0


def run():
    import tkinter as tk

    ip = local_ip()
    base = f'http://{ip}:{PORT}'
    state = {'httpd': None}

    root = tk.Tk()
    root.title('focus-dataflow 服务')
    root.resizable(False, False)
    root.configure(bg='#252525')

    status = tk.Label(root, text='', bg='#252525', fg='#8bc34a', font=('Microsoft YaHei UI', 11))
    status.pack(pady=(14, 6))

    # 只显示目录根地址:数据目录下的文件都能直接访问,路径自己补
    entry = tk.Entry(root, width=46, justify='center', readonlybackground='#1e1e1e',
                     fg='#cfd8dc', bg='#1e1e1e', insertbackground='#cfd8dc',
                     relief='flat', bd=0)
    entry.pack(pady=(0, 4))
    entry.insert(0, base + '/')

    def set_status(text, color):
        status.config(text=text, fg=color)

    def start():
        if state['httpd'] is not None:
            return
        if port_in_use(PORT):
            log('端口已被占用,未启动')
            set_status('端口已被占用 —— 服务可能已在运行', '#ffb74d')
            toggle_btn.config(text='重试启动')
            return
        httpd = serve.build_server(HOST, PORT, serve.DATA_ROOT, serve.EXTRA_FILES)
        state['httpd'] = httpd
        log('server 已绑定 %s:%s' % (HOST, PORT))

        def serve_loop():
            try:
                httpd.serve_forever()
            except BaseException:
                import traceback
                log('serve_forever 异常:\n' + traceback.format_exc())

        threading.Thread(target=serve_loop, daemon=True).start()
        log('serve_forever 线程已启动')
        set_status('运行中', '#8bc34a')
        toggle_btn.config(text='停止服务', state='normal')

    def stop():
        httpd = state['httpd']
        if httpd is None:
            return
        state['httpd'] = None
        httpd.shutdown()
        httpd.server_close()
        set_status('已停止', '#90a4ae')
        toggle_btn.config(text='启动服务', state='normal')

    def toggle():
        if state['httpd'] is None:
            start()
        else:
            stop()

    bottom = tk.Frame(root, bg='#252525')
    bottom.pack(pady=(14, 16))
    toggle_btn = tk.Button(bottom, text='停止服务', width=16, bg='#2a6edc', fg='#fff',
                           activebackground='#3a86ff', activeforeground='#fff',
                           relief='flat', bd=0, pady=8, command=toggle)
    toggle_btn.pack()

    def on_close():
        stop()
        root.destroy()

    root.protocol('WM_DELETE_WINDOW', on_close)

    if not serve.DATA_ROOT.is_dir():
        set_status(f'数据目录不存在: {serve.DATA_ROOT}', '#ef5350')
    else:
        start()

    root.mainloop()


def main():
    try:
        run()
    except Exception as exc:  # noqa: BLE001 - 启动失败要看得见,而不是静默退出
        try:
            import tkinter as tk
            from tkinter import messagebox
            tk.Tk().withdraw()
            messagebox.showerror('focus-dataflow 服务', f'启动失败:\n{exc}')
        except Exception:
            pass


if __name__ == '__main__':
    main()
