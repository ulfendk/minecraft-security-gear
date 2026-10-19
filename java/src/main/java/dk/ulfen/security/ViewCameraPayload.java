package dk.ulfen.security;

import net.minecraft.core.BlockPos;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** Server -> client: look through the camera at `camera` (camera `index` of `count` on the monitor). */
public record ViewCameraPayload(BlockPos camera, int index, int count) implements CustomPacketPayload {
	public static final CustomPacketPayload.Type<ViewCameraPayload> TYPE = new CustomPacketPayload.Type<>(SecRegistry.id("view_camera"));
	public static final StreamCodec<RegistryFriendlyByteBuf, ViewCameraPayload> CODEC = StreamCodec.composite(
		BlockPos.STREAM_CODEC, ViewCameraPayload::camera,
		ByteBufCodecs.VAR_INT, ViewCameraPayload::index,
		ByteBufCodecs.VAR_INT, ViewCameraPayload::count,
		ViewCameraPayload::new);

	@Override
	public Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}
}
