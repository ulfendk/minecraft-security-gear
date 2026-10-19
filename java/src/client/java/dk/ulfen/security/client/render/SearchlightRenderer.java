package dk.ulfen.security.client.render;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedBlockGeoModel;
import com.geckolib.renderer.GeoBlockRenderer;
import com.geckolib.renderer.base.BoneSnapshots;
import com.geckolib.renderer.base.GeoRenderState;
import com.geckolib.renderer.base.RenderPassInfo;
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.SearchlightBlock;
import dk.ulfen.security.blockentity.SearchlightBlockEntity;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.client.renderer.blockentity.state.BlockEntityRenderState;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.client.renderer.state.level.CameraRenderState;
import net.minecraft.resources.Identifier;
import net.minecraft.util.Mth;
import org.jspecify.annotations.Nullable;

/** The searchlight's head sweeps from side to side; when lit it throws a cone of light. */
public class SearchlightRenderer extends GeoBlockRenderer<SearchlightBlockEntity, BlockEntityRenderState> {
	private static final DataTicket<Float> SWEEP = DataTicket.create("secgear_sweep", Float.class);
	private static final DataTicket<Boolean> LIT = DataTicket.create("secgear_lit", Boolean.class);
	private static final DataTicket<Float> YAW = DataTicket.create("secgear_yaw", Float.class);
	private static final float BEAM = 14.0F;

	public SearchlightRenderer(BlockEntityRendererProvider.Context context) {
		super(context, new Model());
	}

	private static class Model extends DefaultedBlockGeoModel<SearchlightBlockEntity> {
		private static final Identifier LIT_TEXTURE = SecRegistry.id("textures/block/searchlight_lit.png");

		Model() {
			super(SecRegistry.id("searchlight"));
		}

		@Override
		public Identifier getTextureResource(GeoRenderState state) {
			return Boolean.TRUE.equals(state.getGeckolibData(LIT)) ? LIT_TEXTURE : super.getTextureResource(state);
		}
	}

	@Override
	public void captureDefaultRenderState(SearchlightBlockEntity light, @Nullable Void related, BlockEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(light, related, state, partialTick);
		boolean lit = light.getBlockState().getValue(SearchlightBlock.POWERED);
		double time = light.getLevel() == null ? 0 : light.getLevel().getGameTime() + partialTick;
		state.addGeckolibData(SWEEP, lit ? SearchlightBlockEntity.sweep(time) : 0f);
		state.addGeckolibData(LIT, lit);
		state.addGeckolibData(YAW, light.yaw(lit ? time : 0) );
	}

	@Override
	public void adjustModelBonesForRender(RenderPassInfo<BlockEntityRenderState> info, BoneSnapshots snapshots) {
		float sweep = info.getOrDefaultGeckolibData(SWEEP, 0f);
		snapshots.ifPresent("head", b -> b.setRotY(sweep * Mth.DEG_TO_RAD));
	}

	@Override
	public void submit(BlockEntityRenderState state, PoseStack poseStack, SubmitNodeCollector collector, CameraRenderState camera) {
		super.submit(state, poseStack, collector, camera);
		if (!Boolean.TRUE.equals(state.getGeckolibData(LIT))) return;
		float yaw = state.getGeckolibData(YAW);
		poseStack.pushPose();
		poseStack.translate(0.5, 0.62, 0.5);
		// Face along the beam: yaw, then tilt up by the searchlight's pitch.
		poseStack.rotateDegrees(com.mojang.math.Axis.YP, -yaw);
		poseStack.rotateDegrees(com.mojang.math.Axis.XP, SearchlightBlockEntity.PITCH);
		collector.submitCustomGeometry(poseStack, RenderTypes.lightning(), (pose, buffer) -> cone(pose, buffer));
		poseStack.popPose();
	}

	/** A soft cone along +z from the lens. */
	private static void cone(PoseStack.Pose pose, VertexConsumer buffer) {
		float r0 = 0.22F, r1 = 2.2F, z0 = 0.45F, z1 = BEAM;
		int sides = 8;
		for (int i = 0; i < sides; i++) {
			double a0 = i * Mth.TWO_PI / sides, a1 = (i + 1) * Mth.TWO_PI / sides;
			float c0 = (float) Math.cos(a0), s0 = (float) Math.sin(a0), c1 = (float) Math.cos(a1), s1 = (float) Math.sin(a1);
			buffer.addVertex(pose, c0 * r0, s0 * r0, z0).setColor(1.0F, 0.96F, 0.75F, 0.45F);
			buffer.addVertex(pose, c0 * r1, s0 * r1, z1).setColor(1.0F, 0.96F, 0.75F, 0.0F);
			buffer.addVertex(pose, c1 * r1, s1 * r1, z1).setColor(1.0F, 0.96F, 0.75F, 0.0F);
			buffer.addVertex(pose, c1 * r0, s1 * r0, z0).setColor(1.0F, 0.96F, 0.75F, 0.45F);
		}
	}

	@Override
	public boolean shouldRenderOffScreen() {
		return true;
	}
}
