package dev.agentcraft.client.console;

import dev.agentcraft.client.console.ConsoleCommands.AgentAction;
import dev.agentcraft.client.console.ConsoleCommands.Answer;
import dev.agentcraft.client.console.ConsoleCommands.Clear;
import dev.agentcraft.client.console.ConsoleCommands.Command;
import dev.agentcraft.client.console.ConsoleCommands.Decide;
import dev.agentcraft.client.console.ConsoleCommands.Empty;
import dev.agentcraft.client.console.ConsoleCommands.Goal;
import dev.agentcraft.client.console.ConsoleCommands.Help;
import dev.agentcraft.client.console.ConsoleCommands.Intent;
import dev.agentcraft.client.console.ConsoleCommands.Invalid;
import dev.agentcraft.client.console.ConsoleCommands.Message;
import dev.agentcraft.client.console.ConsoleCommands.RepoAdd;
import dev.agentcraft.client.console.ConsoleCommands.Repos;
import dev.agentcraft.client.console.ConsoleCommands.ShowDiff;
import dev.agentcraft.client.console.ConsoleCommands.Sound;
import dev.agentcraft.client.console.ConsoleCommands.Status;
import dev.agentcraft.client.console.ConsoleCommands.TaskAction;
import dev.agentcraft.client.foreman.ForemanState;
import dev.agentcraft.client.ui.UiText;
import org.jspecify.annotations.Nullable;

/** Screen copy for the console. Command names stay in {@link ConsoleCommands}. */
public final class ConsoleText {
	private ConsoleText() {
	}

	public static String commandHelp(Command c) {
		return UiText.or("agentcraft.cmd." + c.name() + ".help", c.help());
	}

	/** Player-visible form of a parse error. {@link Invalid#error()} stays English for dev.console.parse. */
	public static String shown(Invalid i) {
		if (i.key() == null || i.key().isEmpty()) {
			return i.error();
		}
		return UiText.or(i.key(), i.error(), i.fmt());
	}

	public static @Nullable String describe(Intent in, ForemanState s) {
		return switch (in) {
			case Goal g -> g.repoId() == null
				? UiText.or("agentcraft.intent.goal", "new goal")
				: UiText.or("agentcraft.intent.goal_repo", "new goal → " + ConsoleCommands.repoName(g.repoId(), s), ConsoleCommands.repoName(g.repoId(), s));
			case Message m -> m.to().equals("all")
				? UiText.or("agentcraft.intent.message_all", "message everyone")
				: UiText.or("agentcraft.intent.message", "message " + ConsoleCommands.displayName(m.to(), s), ConsoleCommands.displayName(m.to(), s));
			case Answer a -> a.option() != null
				? UiText.or("agentcraft.intent.answer_option", "answer " + a.decision().id() + ": " + a.option(), a.decision().id(), a.option())
				: UiText.or("agentcraft.intent.answer_text", "answer " + a.decision().id() + ": free text", a.decision().id());
			case RepoAdd r -> UiText.or("agentcraft.intent.repo_add", "add repo");
			case Repos r -> UiText.or("agentcraft.intent.repos", "list repos");
			case AgentAction a -> {
				String who = a.agentIds().size() == 1 ? ConsoleCommands.displayName(a.agentIds().get(0), s) : null;
				String key = "agentcraft.intent.act." + a.action() + (who == null ? "_n" : "");
				String fallback = who == null ? a.action() + " " + a.agentIds().size() + " agents" : a.action() + " " + who;
				yield who == null ? UiText.or(key, fallback, a.agentIds().size()) : UiText.or(key, fallback, who);
			}
			case TaskAction task -> UiText.or("agentcraft.intent.task", task.action() + " " + task.taskId(), task.action(), task.taskId());
			case ShowDiff d -> UiText.or("agentcraft.intent.diff", "diff " + d.worktree(), d.worktree());
			case Status st -> UiText.or("agentcraft.intent.status", "show status");
			case Help h -> UiText.or("agentcraft.intent.help", "show help");
			case Decide d -> UiText.or("agentcraft.intent.decide", "open decisions");
			case Clear c -> UiText.or("agentcraft.intent.clear", "clear console");
			case Sound so -> so.on() == null
				? UiText.or("agentcraft.intent.sound", "sound status")
				: so.on() ? UiText.or("agentcraft.intent.sound_on", "sound on") : UiText.or("agentcraft.intent.sound_off", "sound off");
			case Invalid i -> null;
			case Empty e -> null;
		};
	}
}
