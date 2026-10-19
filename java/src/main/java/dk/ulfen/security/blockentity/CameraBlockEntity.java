package dk.ulfen.security.blockentity;

import com.geckolib.animatable.GeoBlockEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.util.GeckoLibUtil;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.CameraBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.Mth;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;

/** A security camera. It pans 40 degrees each way unless told to hold still. */
public class CameraBlockEntity extends SyncedBlockEntity implements GeoBlockEntity {
	public static final float TILT = 20.0F, PAN = 40.0F, PAN_PERIOD = 200.0F;
	private final AnimatableInstanceCache cache = GeckoLibUtil.createInstanceCache(this);
	private boolean still;

	public CameraBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.CAMERA_BE, pos, state);
	}

	public boolean isStill() {
		return still;
	}

	public void setStill(boolean still) {
		this.still = still;
		sync();
	}

	/** Pan offset in degrees at a given (fractional) game time. Positive turns the camera to its left. */
	public static float pan(double time, boolean still) {
		return still ? 0.0F : PAN * Mth.sin((float) (time * Mth.TWO_PI / PAN_PERIOD));
	}

	/** World yaw the camera looks along (Minecraft yaw: 0 = south, 90 = west). */
	public float yaw(double time) {
		Direction facing = getBlockState().getValue(CameraBlock.FACING);
		return facing.toYRot() - pan(time, still);
	}

	/** Where the lens is, for camera views and the live monitor feed. */
	public Vec3 lens(double time) {
		float yaw = yaw(time) * Mth.DEG_TO_RAD;
		Vec3 c = Vec3.atCenterOf(worldPosition).add(0, 0.06, 0);
		// Just in front of the hood, so the view isn't blocked by the camera itself.
		return c.add(-Mth.sin(yaw) * 0.62, 0, Mth.cos(yaw) * 0.62);
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return cache;
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		still = input.getBooleanOr("Still", false);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.putBoolean("Still", still);
	}
}
