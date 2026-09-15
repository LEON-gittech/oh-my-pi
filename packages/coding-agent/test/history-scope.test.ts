import { afterEach, describe, expect, it } from "bun:test";
import { resolveHistoryScope } from "@oh-my-pi/pi-coding-agent/session/history-scope";
import { __resetProjectDirCacheForTests, getProjectDir, setProjectDir, TempDir } from "@oh-my-pi/pi-utils";

const originalCwd = getProjectDir();
let tempDir: TempDir | null = null;

afterEach(async () => {
	setProjectDir(originalCwd);
	__resetProjectDirCacheForTests();
	setProjectDir(originalCwd);
	if (tempDir) {
		await tempDir.remove().catch(() => {});
		tempDir = null;
	}
});

describe("resolveHistoryScope", () => {
	it("leaves global recall unfiltered", () => {
		expect(resolveHistoryScope("global", "session-a")).toBeUndefined();
	});

	it("scopes to the active project directory", () => {
		expect(resolveHistoryScope("project", "session-a")).toEqual({ cwd: getProjectDir() });
	});

	it("scopes to the project and the active session", () => {
		expect(resolveHistoryScope("session", "session-a")).toEqual({ cwd: getProjectDir(), sessionId: "session-a" });
	});

	it("degrades to project scope while the session has no id", () => {
		expect(resolveHistoryScope("session", undefined)).toEqual({ cwd: getProjectDir() });
	});

	it("follows the project directory across a relocation", () => {
		tempDir = TempDir.createSync("@omp-history-scope-cwd-");
		const moved = tempDir.path();
		setProjectDir(moved);

		// Scope identity has to track the directory prompts are stamped with, so a
		// `/move` or cross-project resume rescopes recall instead of keeping the
		// previous project's prompts.
		expect(resolveHistoryScope("project", "session-a")?.cwd).toBe(getProjectDir());
		expect(resolveHistoryScope("project", "session-a")?.cwd).not.toBe(originalCwd);
		expect(resolveHistoryScope("session", "session-a")).toEqual({ cwd: getProjectDir(), sessionId: "session-a" });
	});
});
