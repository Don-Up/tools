from cardtimer_for_anki.parser import (
    field_for,
    msg_type_for,
    parse_command,
    parse_push_command,
)


def test_push_parses_simple_name():
    assert parse_push_command("cardtimer:push:hello") == "hello"


def test_push_decodes_url_encoded_space():
    assert parse_push_command("cardtimer:push:hello%20world") == "hello world"


def test_push_returns_none_for_wrong_prefix():
    assert parse_push_command("other:push:hello") is None


def test_push_returns_none_for_missing_push_keyword():
    assert parse_push_command("cardtimer:send:hello") is None


def test_push_returns_none_for_empty_name():
    assert parse_push_command("cardtimer:push:") is None


def test_push_handles_unicode():
    assert parse_push_command("cardtimer:push:%E4%B8%AD%E6%96%87") == "中文"


def test_push_returns_none_for_non_string():
    assert parse_push_command(None) is None
    assert parse_push_command(123) is None
    assert parse_push_command([]) is None


def test_push_preserves_unreserved_chars():
    assert parse_push_command("cardtimer:push:hello-world_1.0") == "hello-world_1.0"


def test_parse_command_returns_action_and_name():
    assert parse_command("cardtimer:push:hello") == ("push", "hello")
    assert parse_command("cardtimer:q:hello") == ("q", "hello")
    assert parse_command("cardtimer:w:hello") == ("w", "hello")
    assert parse_command("cardtimer:e:hello") == ("e", "hello")
    assert parse_command("cardtimer:send:hello") == ("send", "hello")


def test_parse_command_decodes_url_encoded():
    assert parse_command("cardtimer:w:%E4%B8%AD%E6%96%87") == ("w", "中文")


def test_parse_command_sends_action():
    assert parse_command("cardtimer:send:%E4%B8%AD%E6%96%87") == ("send", "中文")


def test_parse_command_returns_none_for_unknown_prefix():
    assert parse_command("cardtimer:xyz:hello") is None
    assert parse_command("other:push:hello") is None


def test_parse_command_returns_none_for_empty_name():
    assert parse_command("cardtimer:q:") is None
    assert parse_command("cardtimer:w:") is None
    assert parse_command("cardtimer:e:") is None
    assert parse_command("cardtimer:send:") is None


def test_parse_command_returns_none_for_non_string():
    assert parse_command(None) is None
    assert parse_command(123) is None
    assert parse_command([]) is None


def test_msg_type_for_known_actions():
    assert msg_type_for("push") == "anki-push"
    assert msg_type_for("q") == "cn-en-q"
    assert msg_type_for("w") == "cn-en-append"
    assert msg_type_for("e") == "cn-en-br"
    assert msg_type_for("send") == "cn-en-q-confirm"


def test_msg_type_for_send_returns_q_confirm():
    assert msg_type_for("send") == "cn-en-q-confirm"


def test_msg_type_for_unknown_action():
    assert msg_type_for("xyz") is None


def test_field_for_known_actions():
    assert field_for("push") == "name"
    assert field_for("q") == "content"
    assert field_for("w") == "content"
    assert field_for("e") == "content"


def test_field_for_unknown_action():
    assert field_for("xyz") is None
