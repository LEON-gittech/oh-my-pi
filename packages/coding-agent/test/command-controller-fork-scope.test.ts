import { beforeAll, describe, expect, it } from "bun:test";
import { CommandController } from "@oh-my-pi/pi-coding-agent/modes/controllers/command-controller";
import { initTheme } from "@oh-my-pi/pi-coding-agent/modes/theme/theme";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";

beforeAll(async () => {
	await initTheme(false);
});

interface ForkHarness {
	controller: CommandController;
	refreshes: () => number;
	errors: () => string[];
}

function makeHarness(forkSucceeds: boolean): ForkHarness {
	let refreshes = 0;
	const errors: string[] = [];

	const ctx = {
		session: {
			isStreaming: false,
			fork: async () => forkSucceeds,
			sessionFile: "/tmp/sessions/forked.jsonl",
		},
		statusContainer: { disposeChildren: () => {} },
		statusLine: { invalidate: () => {} },
		refreshHistoryScope: () => {
			refreshes++;
		},
		showError: (message: string) => {
			errors.push(message);
		},
		present: () => {},
		ui: { requestRender: () => {} },
	} as unknown as InteractiveModeContext;

	return { controller: new CommandController(ctx), refreshes: () => refreshes, errors: () => errors };
}

describe("CommandController /fork recall scope", () => {
	it("re-snapshots prompt recall for the session id the fork minted", async () => {
		const harness = makeHarness(true);

		await harness.controller.handleForkCommand();

		// Session-scoped recall keys off the live session id; without this the
		// editor would keep offering the pre-fork session's prompts.
		expect(harness.refreshes()).toBe(1);
		expect(harness.errors()).toEqual([]);
	});

	it("leaves recall alone when the fork fails", async () => {
		const harness = makeHarness(false);

		await harness.controller.handleForkCommand();

		expect(harness.refreshes()).toBe(0);
		expect(harness.errors()).toHaveLength(1);
	});
});
