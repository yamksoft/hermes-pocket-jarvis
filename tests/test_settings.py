from agent.settings import safe_name


def test_safe_name_removes_untrusted_characters() -> None:
    assert safe_name("  Yahya / هاتف! ", "user") == "Yahya"


def test_safe_name_has_a_fallback() -> None:
    assert safe_name("@@@", "user") == "user"
