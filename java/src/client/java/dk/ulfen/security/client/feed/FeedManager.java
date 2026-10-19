package dk.ulfen.security.client.feed;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import com.mojang.blaze3d.platform.NativeImage;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.blockentity.CameraBlockEntity;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.core.BlockPos;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/**
 * Keeps one small live texture per visible monitor and redraws them a field at
 * a time, taking turns, so even several monitors cost only a few milliseconds a tick.
 */
public final class FeedManager {
	private static final int MAX_FEEDS = 6, FORGET_AFTER = 40, FIELDS_PER_TICK = 2;

	private static final class Feed {
		final Identifier id;
		final DynamicTexture texture;
		BlockPos camera;
		int number;
		int field;
		boolean ready;
		long lastSeen;

		Feed(Identifier id, DynamicTexture texture) {
			this.id = id;
			this.texture = texture;
		}
	}

	private static final Map<BlockPos, Feed> FEEDS = new HashMap<>();
	private static final List<BlockPos> QUEUE = new ArrayList<>();
	private static int turn;

	private FeedManager() {}

	/** Called while a monitor is drawn: the texture to show, or null while the first picture is still being drawn. */
	public static @Nullable Identifier request(BlockPos monitor, BlockPos camera, int number) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.level == null) return null;
		Feed feed = FEEDS.get(monitor);
		if (feed == null) {
			if (FEEDS.size() >= MAX_FEEDS) return null;
			Identifier id = SecRegistry.id("feed/" + monitor.getX() + "_" + monitor.getY() + "_" + monitor.getZ());
			DynamicTexture texture = new DynamicTexture(() -> "secgear monitor feed", FeedRaycaster.WIDTH, FeedRaycaster.HEIGHT, true);
			mc.getTextureManager().register(id, texture);
			feed = new Feed(id, texture);
			FEEDS.put(monitor.immutable(), feed);
		}
		if (!camera.equals(feed.camera)) {
			feed.camera = camera.immutable();
			feed.ready = false;
			feed.field = 0;
		}
		feed.number = number;
		feed.lastSeen = mc.level.getGameTime();
		return feed.ready ? feed.id : null;
	}

	/** Client tick: forget monitors nobody looks at and redraw a couple of fields. */
	public static void tick(Minecraft mc) {
		if (mc.level == null) {
			clear(mc);
			return;
		}
		long now = mc.level.getGameTime();
		for (Iterator<Map.Entry<BlockPos, Feed>> it = FEEDS.entrySet().iterator(); it.hasNext();) {
			Map.Entry<BlockPos, Feed> e = it.next();
			if (now - e.getValue().lastSeen > FORGET_AFTER || now < e.getValue().lastSeen) {
				mc.getTextureManager().release(e.getValue().id);
				it.remove();
			}
		}
		if (FEEDS.isEmpty()) return;
		QUEUE.clear();
		QUEUE.addAll(FEEDS.keySet());
		for (int n = 0; n < FIELDS_PER_TICK; n++) {
			Feed feed = FEEDS.get(QUEUE.get(turn++ % QUEUE.size()));
			draw(mc, feed, now);
		}
	}

	private static void draw(Minecraft mc, Feed feed, long now) {
		if (feed.camera == null || !(mc.level.getBlockEntity(feed.camera) instanceof CameraBlockEntity cam)) return;
		NativeImage image = feed.texture.getPixels();
		if (image == null) return;
		FeedRaycaster.render(image, mc.level, cam.lens(now), cam.yaw(now), CameraBlockEntity.TILT, feed.field, feed.number);
		feed.field = (feed.field + 1) % FeedRaycaster.FIELDS;
		if (feed.field == 0) feed.ready = true;
		feed.texture.upload();
	}

	public static void clear(Minecraft mc) {
		for (Feed f : FEEDS.values()) mc.getTextureManager().release(f.id);
		FEEDS.clear();
	}
}
