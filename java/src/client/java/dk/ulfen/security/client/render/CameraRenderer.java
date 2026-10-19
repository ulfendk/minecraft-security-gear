package dk.ulfen.security.client.render;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.renderer.GeoBlockRenderer;
import com.geckolib.renderer.base.BoneSnapshots;
import com.geckolib.renderer.base.RenderPassInfo;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.CameraBlock;
import dk.ulfen.security.blockentity.CameraBlockEntity;
import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;
import net.minecraft.client.renderer.blockentity.state.BlockEntityRenderState;
import net.minecraft.util.Mth;
import org.jspecify.annotations.Nullable;

/** Draws the camera from its GeckoLib model; the head follows the same pan as the live feed. */
public class CameraRenderer extends GeoBlockRenderer<CameraBlockEntity, BlockEntityRenderState> {
	private static final DataTicket<Float> PAN = DataTicket.create("secgear_pan", Float.class);
	private static final DataTicket<Boolean> CEILING = DataTicket.create("secgear_ceiling", Boolean.class);

	public CameraRenderer(BlockEntityRendererProvider.Context context) {
		super(context, SecRegistry.CAMERA_BE);
	}

	@Override
	public void captureDefaultRenderState(CameraBlockEntity camera, @Nullable Void related, BlockEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(camera, related, state, partialTick);
		double time = camera.getLevel() == null ? 0 : camera.getLevel().getGameTime() + partialTick;
		state.addGeckolibData(PAN, CameraBlockEntity.pan(time, camera.isStill()));
		state.addGeckolibData(CEILING, camera.getBlockState().getValue(CameraBlock.CEILING));
	}

	@Override
	public void adjustModelBonesForRender(RenderPassInfo<BlockEntityRenderState> info, BoneSnapshots snapshots) {
		boolean ceiling = info.getOrDefaultGeckolibData(CEILING, false);
		float pan = info.getOrDefaultGeckolibData(PAN, 0f);
		snapshots.ifPresent("head", b -> b.setRotY(pan * Mth.DEG_TO_RAD));
		snapshots.ifPresent("wall_mount", b -> b.skipRender(ceiling).skipChildrenRender(ceiling));
		snapshots.ifPresent("ceiling_mount", b -> b.skipRender(!ceiling).skipChildrenRender(!ceiling));
	}
}
