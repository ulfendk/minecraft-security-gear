package dk.ulfen.security.client.render;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.mojang.math.Axis;

import dk.ulfen.security.block.MonitorBlock;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import dk.ulfen.security.client.feed.FeedManager;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.client.renderer.blockentity.state.BlockEntityRenderState;
import net.minecraft.client.renderer.feature.ModelFeatureRenderer;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.resources.Identifier;
import net.minecraft.util.LightCoordsUtil;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/** Puts the live camera picture on the monitor's screen (the block model shows static underneath). */
public class MonitorRenderer implements BlockEntityRenderer<MonitorBlockEntity, MonitorRenderer.State> {
	public static final int VIEW_DISTANCE = 24;

	public static class State extends BlockEntityRenderState {
		Direction facing = Direction.NORTH;
		@Nullable Identifier feed;
	}

	public MonitorRenderer(BlockEntityRendererProvider.Context context) {}

	@Override
	public State createRenderState() {
		return new State();
	}

	@Override
	public void extractRenderState(MonitorBlockEntity monitor, State state, float partialTicks, Vec3 cameraPosition, ModelFeatureRenderer.@Nullable CrumblingOverlay breakProgress) {
		BlockEntityRenderer.super.extractRenderState(monitor, state, partialTicks, cameraPosition, breakProgress);
		state.facing = monitor.getBlockState().getValue(MonitorBlock.FACING);
		BlockPos camera = monitor.current();
		state.feed = camera == null ? null : FeedManager.request(monitor.getBlockPos(), camera, monitor.index() + 1);
	}

	@Override
	public void submit(State state, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState camera) {
		if (state.feed == null) return;
		poseStack.pushPose();
		poseStack.translate(0.5, 0, 0.5);
		poseStack.rotateDegrees(Axis.YP, -(state.facing.toYRot() + 180));
		poseStack.translate(-0.5, 0, -0.5);
		collector.submitCustomGeometry(poseStack, RenderTypes.entitySolid(state.feed), (pose, buffer) -> screen(pose, buffer));
		poseStack.popPose();
	}

	/** The screen rectangle, a hair in front of the static, facing north in model space. */
	private static void screen(PoseStack.Pose pose, VertexConsumer buffer) {
		float x0 = 2 / 16F, x1 = 14 / 16F, y0 = 3 / 16F, y1 = 12 / 16F, z = 3.9F / 16F;
		vertex(pose, buffer, x1, y1, z, 0, 0);
		vertex(pose, buffer, x1, y0, z, 0, 1);
		vertex(pose, buffer, x0, y0, z, 1, 1);
		vertex(pose, buffer, x0, y1, z, 1, 0);
	}

	private static void vertex(PoseStack.Pose pose, VertexConsumer buffer, float x, float y, float z, float u, float v) {
		buffer.addVertex(pose, x, y, z).setColor(-1).setUv(u, v).setOverlay(OverlayTexture.NO_OVERLAY).setLight(LightCoordsUtil.FULL_BRIGHT).setNormal(pose, 0, 0, -1);
	}

	@Override
	public int getViewDistance() {
		return VIEW_DISTANCE;
	}
}
