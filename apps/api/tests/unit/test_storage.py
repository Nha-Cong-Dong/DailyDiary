"""`delete_keys`: chia lô 1000 key và không nuốt lỗi từng key của delete_objects (Quiet=True vẫn trả 200)."""

import pytest

from app.core.storage import DeleteFailed, delete_keys


class StubClient:
    def __init__(self, errors_per_call: list[int] | None = None) -> None:
        self.calls: list[list[str]] = []
        self.errors = list(errors_per_call or [])

    def delete_objects(self, Bucket: str, Delete: dict) -> dict:
        keys = [o["Key"] for o in Delete["Objects"]]
        self.calls.append(keys)
        n = self.errors.pop(0) if self.errors else 0
        return {"Errors": [{"Key": k, "Code": "AccessDenied"} for k in keys[:n]]} if n else {}


def test_batches_of_1000():
    client = StubClient()
    delete_keys(client, "b", [f"k{i}" for i in range(2500)])
    assert [len(c) for c in client.calls] == [1000, 1000, 500]


def test_raises_when_some_keys_refused_but_finishes_every_batch():
    client = StubClient(errors_per_call=[2, 0, 1])
    with pytest.raises(DeleteFailed) as info:
        delete_keys(client, "b", [f"k{i}" for i in range(2100)])
    assert info.value.failed == 3
    assert len(client.calls) == 3  # vẫn thử xóa các lô sau
    assert "k0" not in str(info.value)  # thông điệp không chứa key (key có user_id)
