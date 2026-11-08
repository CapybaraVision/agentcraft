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
}
