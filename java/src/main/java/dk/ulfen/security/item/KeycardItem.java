package dk.ulfen.security.item;

import net.minecraft.world.item.Item;

/** A keycard: clearance level 1 (guard), 2 (officer) or 3 (warden). Swipe it on a keycard reader. */
public class KeycardItem extends Item {
	public final int level;

	public KeycardItem(Properties properties, int level) {
		super(properties);
		this.level = level;
	}
}
