package dk.ulfen.security.blockentity;

import com.geckolib.animatable.GeoBlockEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.util.GeckoLibUtil;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.SearchlightBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.util.Mth;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.LightBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;
import org.jspecify.annotations.Nullable;

/**
 * A powered searchlight sweeps 60 degrees each way. Where its beam lands it
 * places an invisible light block, so the spot really is lit; it removes it again
 * as the beam moves on or the light is switched off.
 */
public class SearchlightBlockEntity extends net.minecraft.world.level.block.entity.BlockEntity implements GeoBlockEntity {
	public static final float SWEEP = 60.0F, PERIOD = 240.0F, PITCH = -10.0F, RANGE = 32.0F;
	private final AnimatableInstanceCache cache = GeckoLibUtil.createInstanceCache(this);
	private @Nullable BlockPos light;

	public SearchlightBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.SEARCHLIGHT_BE, pos, state);
	}

	public static float sweep(double time) {
		return SWEEP * Mth.sin((float) (time * Mth.TWO_PI / PERIOD));
	}

	public float yaw(double time) {
		return getBlockState().getValue(SearchlightBlock.FACING).toYRot() - sweep(time);
	}

	public static Vec3 direction(float yaw, float pitch) {
		float y = yaw * Mth.DEG_TO_RAD, p = pitch * Mth.DEG_TO_RAD;
		return new Vec3(-Mth.sin(y) * Mth.cos(p), -Mth.sin(p), Mth.cos(y) * Mth.cos(p));
	}

	public Vec3 lens() {
		return Vec3.atBottomCenterOf(worldPosition).add(0, 0.62, 0);
	}

	public static void serverTick(Level level, BlockPos pos, BlockState state, SearchlightBlockEntity be) {
		if (level.getGameTime() % 5 != 0) return;
		if (!state.getValue(SearchlightBlock.POWERED)) {
			be.clearLight();
			return;
		}
		Vec3 from = be.lens();
		Vec3 dir = direction(be.yaw(level.getGameTime()), PITCH);
		BlockHitResult hit = level.clip(new ClipContext(from.add(dir.scale(0.7)), from.add(dir.scale(RANGE)), ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, CollisionContext.empty()));
		if (hit.getType() == HitResult.Type.MISS) {
			be.clearLight();
			return;
		}
		BlockPos spot = hit.getBlockPos().relative(hit.getDirection());
		if (spot.equals(be.light)) return;
		be.clearLight();
		if (level.getBlockState(spot).isAir()) {
			level.setBlock(spot, Blocks.LIGHT.defaultBlockState().setValue(LightBlock.LEVEL, 14), Block.UPDATE_ALL);
			be.light = spot;
			be.setChanged();
		}
	}

	public void clearLight() {
		if (light == null || level == null) return;
		if (level.getBlockState(light).is(Blocks.LIGHT)) level.setBlock(light, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
		light = null;
		setChanged();
	}

	@Override
	public void preRemoveSideEffects(BlockPos pos, BlockState state) {
		clearLight();
		super.preRemoveSideEffects(pos, state);
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
		light = input.read("Light", BlockPos.CODEC).orElse(null);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.storeNullable("Light", BlockPos.CODEC, light);
	}
}
