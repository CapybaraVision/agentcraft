package dev.agentcraft.client.ui;

import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;

/**
 * Minecraft language lookup for AgentCraft chrome. Keys live in
 * {@code assets/agentcraft/lang/en_us.json} and {@code ko_kr.json}. The game's own
 * {@code lang} option chooses the file; a missing Korean string falls back to English.
 */
public final class UiText {
	private UiText() {
	}

	public static Component c(String key) {
		return Component.translatable(key);
	}

	/** Translated text, or {@code fallback} when neither language file has the key. */
	public static String or(String key, String fallback, Object... args) {
		String value = args == null || args.length == 0 ? I18n.get(key) : I18n.get(key, args);
		if (value == null || value.isEmpty() || value.equals(key)) {
			return fallback;
		}
		return value;
	}

	/**
	 * Nameplate activity. Fixed sim phrases are translated; everything else, including a goal
	 * or command the user typed, is shown as stored (backticks stripped).
	 */
	public static String plateActivity(String act) {
		if (act.startsWith("asking you")) {
			return or("agentcraft.plate.question", "question for you");
		}
		if (act.equals("some failing")) {
			return or("agentcraft.plate.failing_some", "some failing");
		}
		java.util.regex.Matcher failing = java.util.regex.Pattern.compile("^(\\d+) failing$").matcher(act);
		if (failing.matches()) {
			return or("agentcraft.plate.failing_n", failing.group(1) + " failing", failing.group(1));
		}
		return act.replace("`", "");
	}
}
