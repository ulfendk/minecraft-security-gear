package dk.ulfen.security.client.render;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;

import dk.ulfen.security.blockentity.LaserBlockEntity;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.blockentity.BlockEntityRenderer;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.client.renderer.blockentity.state.BlockEntityRenderState;
import net.minecraft.client.renderer.feature.ModelFeatureRenderer;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.core.Direction;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/** Laser beams (red tripwire, blue fence) and the thin wire of a tripwire bomb. */
public class LaserRenderer implements BlockEntityRenderer<LaserBlockEntity, LaserRenderer.State> {
	public static class State extends BlockEntityRenderState {
		Direction facing = Direction.NORTH;
		int length;
		float r, g, b, a, radius;
		float flicker;
	}

	public LaserRenderer(BlockEntityRendererProvider.Context context) {}

	@Override
	public State createRenderState() {
		return new State();
	}

	@Override
	public void extractRenderState(LaserBlockEntity laser, State state, float partialTicks, Vec3 cameraPosition, ModelFeatureRenderer.@Nullable CrumblingOverlay breakProgress) {
		BlockEntityRenderer.super.extractRenderState(laser, state, partialTicks, cameraPosition, breakProgress);
		state.facing = laser.facing();
		state.length = laser.length();
		long t = laser.getLevel() == null ? 0 : laser.getLevel().getGameTime();
		state.flicker = 0.85F + 0.15F * (float) Math.sin((t + partialTicks) * 0.9);
		if (laser.isTripwire()) {
			state.r = 0.75F; state.g = 0.75F; state.b = 0.72F; state.a = 0.55F; state.radius = 0.012F;
		} else if (laser.isFence()) {
			state.r = 0.2F; state.g = 0.6F; state.b = 1.0F; state.a = 0.85F; state.radius = 0.035F;
		} else {
			state.r = 1.0F; state.g = 0.12F; state.b = 0.08F; state.a = 0.85F; state.radius = 0.03F;
		}
	}

	@Override
	public void submit(State state, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState camera) {
		if (state.length <= 0) return;
		poseStack.pushPose();
		poseStack.translate(0.5, 0.5, 0.5);
		poseStack.rotate(state.facing.getRotation());
		float start = 0.25F, end = state.length + 0.5F;
		collector.submitCustomGeometry(poseStack, RenderTypes.lightning(), (pose, buffer) -> {
			beam(pose, buffer, state, start, end, state.radius, state.a * state.flicker);
			beam(pose, buffer, state, start, end, state.radius * 2.5F, state.a * 0.25F * state.flicker);
		});
		poseStack.popPose();
	}

	/** A square tube along +y. */
	private static void beam(PoseStack.Pose pose, VertexConsumer buffer, State s, float y0, float y1, float r, float a) {
		float[][] corners = {{-r, -r}, {r, -r}, {r, r}, {-r, r}};
		for (int i = 0; i < 4; i++) {
			float[] p = corners[i], q = corners[(i + 1) % 4];
			buffer.addVertex(pose, p[0], y0, p[1]).setColor(s.r, s.g, s.b, a);
			buffer.addVertex(pose, q[0], y0, q[1]).setColor(s.r, s.g, s.b, a);
			buffer.addVertex(pose, q[0], y1, q[1]).setColor(s.r, s.g, s.b, a);
			buffer.addVertex(pose, p[0], y1, p[1]).setColor(s.r, s.g, s.b, a);
		}
	}

	@Override
	public boolean shouldRenderOffScreen() {
		return true;
	}

	@Override
	public int getViewDistance() {
		return 96;
	}
}
