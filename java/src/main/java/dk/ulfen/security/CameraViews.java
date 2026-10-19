package dk.ulfen.security;

import dk.ulfen.security.blockentity.CameraBlockEntity;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;

/**
 * Looking through a camera from a monitor. The view itself happens on the client
 * (the player's body stays at the monitor; see the client's CameraViewClient).
 */
public final class CameraViews {
	private CameraViews() {}

	public static void start(ServerPlayer player, MonitorBlockEntity monitor) {
		BlockPos cam = monitor.current();
		if (cam == null || !(player.level().getBlockEntity(cam) instanceof CameraBlockEntity)) {
			player.sendOverlayMessage(Component.translatable("secgear.monitor.lost"));
			return;
		}
		ServerPlayNetworking.send(player, new ViewCameraPayload(cam, monitor.index() + 1, monitor.cameras().size()));
	}
}
