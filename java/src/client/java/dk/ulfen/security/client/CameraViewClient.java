package dk.ulfen.security.client;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.ViewCameraPayload;
import dk.ulfen.security.blockentity.CameraBlockEntity;
import dk.ulfen.security.entity.CameraView;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.player.ClientInput;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * Looking through a security camera: the game renders from an invisible stand-in
 * at the lens while your body stays at the monitor. Sneak (or get hurt) to stop.
 */
public final class CameraViewClient {
	private static @Nullable CameraView view;
	private static @Nullable BlockPos camera;
	private static @Nullable ClientInput savedInput;
	private static int index, count, startTick;

	private CameraViewClient() {}

	public static boolean active() {
		return view != null;
	}

	public static void start(ViewCameraPayload payload) {
		Minecraft mc = Minecraft.getInstance();
		if (mc.level == null || mc.player == null) return;
		if (view != null) stop(mc, null);
		camera = payload.camera();
		index = payload.index();
		count = payload.count();
		view = new CameraView(SecRegistry.CAMERA_VIEW, mc.level);
		follow(mc, true);
		savedInput = mc.player.input;
		mc.player.input = new ClientInput();
		mc.setCameraEntity(view);
		startTick = mc.player.tickCount;
	}

	public static void tick(Minecraft mc) {
		if (view == null) return;
		if (mc.player == null || mc.level == null) {
			view = null;
			return;
		}
		// Ignore the sneak that might still be held from the moment the view started.
		boolean sneak = mc.options.keyShift.isDown() && mc.player.tickCount - startTick > 5;
		if (sneak || mc.player.hurtTime > 0 || mc.player.isDeadOrDying()) {
			stop(mc, null);
			return;
		}
		if (!(mc.level.getBlockEntity(camera) instanceof CameraBlockEntity)) {
			stop(mc, Component.translatable("secgear.monitor.lost"));
			return;
		}
		follow(mc, false);
	}

	private static void follow(Minecraft mc, boolean snap) {
		if (!(mc.level.getBlockEntity(camera) instanceof CameraBlockEntity cam)) return;
		long t = mc.level.getGameTime();
		Vec3 lens = cam.lens(t);
		float eye = view.getEyeHeight();
		if (snap) {
			view.snapTo(lens.x, lens.y - eye, lens.z, cam.yaw(t), CameraBlockEntity.TILT);
		} else {
			view.setOldPosAndRot();
			view.setPos(lens.x, lens.y - eye, lens.z);
			view.setYRot(cam.yaw(t));
			view.setXRot(CameraBlockEntity.TILT);
		}
		view.setYHeadRot(view.getYRot());
	}

	public static void stop(Minecraft mc, @Nullable Component message) {
		view = null;
		if (mc.player != null) {
			if (savedInput != null) mc.player.input = savedInput;
			mc.setCameraEntity(mc.player);
			if (message != null) mc.player.sendOverlayMessage(message);
		}
		savedInput = null;
	}

	/** HUD while viewing: camera number, a blinking REC and how to leave. */
	public static void hud(GuiGraphicsExtractor g, DeltaTracker delta) {
		Minecraft mc = Minecraft.getInstance();
		if (view == null || mc.level == null) return;
		g.text(mc.font, Component.translatable("secgear.view.hud", index + "/" + count), 8, 8, 0xFFF2F2F2, true);
		if ((mc.level.getGameTime() / 10) % 2 == 0) g.text(mc.font, "● REC", g.guiWidth() - 44, 8, 0xFFFF3B30, true);
		Component hint = Component.translatable("secgear.monitor.viewing", index, count);
		g.text(mc.font, hint, (g.guiWidth() - mc.font.width(hint)) / 2, g.guiHeight() - 60, 0xFFF2F2F2, true);
	}
}
