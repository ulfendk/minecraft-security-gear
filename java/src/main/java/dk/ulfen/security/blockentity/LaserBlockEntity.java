package dk.ulfen.security.blockentity;

import java.util.List;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.LaserEmitterBlock;
import dk.ulfen.security.block.LaserReceiverBlock;
import dk.ulfen.security.block.Signals;
import dk.ulfen.security.block.TripwireBombBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/** The beam of a laser emitter, laser fence or tripwire bomb: how far it reaches, and what crosses it. */
public class LaserBlockEntity extends SyncedBlockEntity {
	public static final int LASER_RANGE = 16, TRIPWIRE_RANGE = 8;
	private int length;

	public LaserBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.LASER_BE, pos, state);
	}

	public int length() {
		return length;
	}

	public boolean isTripwire() {
		return getBlockState().getBlock() instanceof TripwireBombBlock;
	}

	public boolean isFence() {
		return getBlockState().getBlock() instanceof LaserEmitterBlock e && e.fence;
	}

	public Direction facing() {
		return getBlockState().getValue(BlockStateProperties.FACING);
	}

	/** Free length of the beam before it hits something solid. */
	public static int trace(Level level, BlockPos pos, Direction dir, int max) {
		int len = 0;
		for (int i = 1; i <= max; i++) {
			if (!Signals.seeThrough(level, pos.relative(dir, i))) break;
			len = i;
		}
		return len;
	}

	public static AABB beamBox(BlockPos pos, Direction dir, int length) {
		Vec3 c = Vec3.atCenterOf(pos);
		Vec3 a = c.add(Vec3.atLowerCornerOf(dir.getUnitVec3i()).scale(0.5));
		Vec3 b = c.add(Vec3.atLowerCornerOf(dir.getUnitVec3i()).scale(length + 0.5));
		return new AABB(a, b).inflate(0.08);
	}

	public static void serverTick(Level level, BlockPos pos, BlockState state, LaserBlockEntity be) {
		long t = level.getGameTime();
		Direction dir = state.getValue(BlockStateProperties.FACING);
		boolean tripwire = be.isTripwire();
		if (t % 4 == 0) {
			boolean off = state.hasProperty(BlockStateProperties.POWERED) && state.getValue(BlockStateProperties.POWERED);
			int len = off ? 0 : trace(level, pos, dir, tripwire ? TRIPWIRE_RANGE : LASER_RANGE);
			if (len != be.length) {
				be.length = len;
				be.sync();
			}
		}
		if (be.length <= 0 || t % 2 != 0) return;
		List<Entity> hit = level.getEntities((Entity) null, beamBox(pos, dir, be.length), Signals::triggers);
		if (hit.isEmpty()) return;
		if (tripwire) {
			TripwireBombBlock.detonate(level, pos);
			return;
		}
		BlockPos end = pos.relative(dir, be.length + 1);
		BlockState endState = level.getBlockState(end);
		if (endState.getBlock() instanceof LaserReceiverBlock receiver) receiver.trigger(level, end, endState);
		if (be.isFence() && level instanceof ServerLevel server) {
			for (Entity e : hit) if (e instanceof LivingEntity living) living.hurtServer(server, level.damageSources().magic(), 2.0F);
		}
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		length = input.getIntOr("Length", 0);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.putInt("Length", length);
	}
}
