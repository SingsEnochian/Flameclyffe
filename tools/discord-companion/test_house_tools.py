from pathlib import Path

from house_bootstrap import ROOMS, update_env_value
from run_all import ALL_PROFILES, parse_profiles


def test_room_names_are_unique() -> None:
    names = [room.name for room in ROOMS]
    assert len(names) == len(set(names))


def test_all_companion_profiles_are_separate() -> None:
    assert ALL_PROFILES == ("yggdrasil", "vee", "faer", "bluebird", "vethrlauf")
    assert parse_profiles("vee,faer") == ["vee", "faer"]


def test_update_env_preserves_secrets(tmp_path: Path) -> None:
    env = tmp_path / ".env"
    env.write_text("DEEPSEEK_API_KEY=secret\nALLOWED_CHANNEL_IDS=old\n", encoding="utf-8")
    update_env_value(env, "ALLOWED_CHANNEL_IDS", "1,2,3")
    assert env.read_text(encoding="utf-8") == "DEEPSEEK_API_KEY=secret\nALLOWED_CHANNEL_IDS=1,2,3\n"
