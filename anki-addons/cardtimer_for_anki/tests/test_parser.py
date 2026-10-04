import pytest
from cardtimer_for_anki.parser import parse_push_command


def test_parses_simple_name():
    assert parse_push_command("cardtimer:push:hello") == "hello"


def test_decodes_url_encoded_space():
    assert parse_push_command("cardtimer:push:hello%20world") == "hello world"


def test_returns_none_for_wrong_prefix():
    assert parse_push_command("other:push:hello") is None


def test_returns_none_for_missing_push_keyword():
    assert parse_push_command("cardtimer:send:hello") is None


def test_returns_none_for_empty_name():
    assert parse_push_command("cardtimer:push:") is None


def test_handles_unicode():
    assert parse_push_command("cardtimer:push:%E4%B8%AD%E6%96%87") == "中文"


def test_returns_none_for_non_string():
    assert parse_push_command(None) is None
    assert parse_push_command(123) is None
    assert parse_push_command([]) is None


def test_preserves_unreserved_chars():
    assert parse_push_command("cardtimer:push:hello-world_1.0") == "hello-world_1.0"
