package dk.ulfen.security.block;

import java.util.HashMap;
import java.util.Map;
import java.util.WeakHashMap;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.IronBarsBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;

/** Shared helpers for redstone outputs and beams. */
public final class Signals {
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;

	private Signals() {}

	private static final Map<Level, Map<Long, Long>> PULSE_UNTIL = new WeakHashMap<>();

	/** Turn an output block on for `ticks` (it turns itself off in its scheduled tick, see {@link #tickOff}). */
	public static void pulse(Level level, BlockPos pos, BlockState state, Direction attachedTo, int ticks) {
		PULSE_UNTIL.computeIfAbsent(level, l -> new HashMap<>()).put(pos.asLong(), level.getGameTime() + ticks);
		if (!state.getValue(POWERED)) {
			level.setBlock(pos, state.setValue(POWERED, true), Block.UPDATE_ALL);
			updateAttached(level, pos, state.getBlock(), attachedTo);
		}
		level.scheduleTick(pos, state.getBlock(), ticks);
	}

	/** Scheduled tick of a pulsed block: stay on while re-triggered, otherwise switch off. */
	public static void tickOff(Level level, BlockPos pos, BlockState state, Direction attachedTo) {
		Map<Long, Long> until = PULSE_UNTIL.get(level);
		long end = until == null ? 0 : until.getOrDefault(pos.asLong(), 0L);
		if (end > level.getGameTime()) {
			level.scheduleTick(pos, state.getBlock(), (int) (end - level.getGameTime()));
			return;
		}
		if (until != null) until.remove(pos.asLong());
		off(level, pos, state, attachedTo);
	}

	public static void off(Level level, BlockPos pos, BlockState state, Direction attachedTo) {
		if (state.getValue(POWERED)) {
			level.setBlock(pos, state.setValue(POWERED, false), Block.UPDATE_ALL);
			updateAttached(level, pos, state.getBlock(), attachedTo);
		}
	}

	/** Like buttons: update around the block and around the block it hangs on. */
	public static void updateAttached(Level level, BlockPos pos, Block block, Direction attachedTo) {
		level.updateNeighborsAt(pos, block);
		level.updateNeighborsAt(pos.relative(attachedTo), block);
	}

	/** Beams, wires and searchlight light pass through air, glass, bars, plants and other non-solid blocks. */
	public static boolean seeThrough(BlockGetter level, BlockPos pos) {
		BlockState s = level.getBlockState(pos);
		if (s.isAir() || s.getCollisionShape(level, pos).isEmpty()) return true;
		if (s.getBlock() instanceof IronBarsBlock) return true;
		String path = BuiltInRegistries.BLOCK.getKey(s.getBlock()).getPath();
		return path.contains("glass") || path.equals("bridge_deck");
	}

	/** Entities a beam or sensor reacts to. */
	public static boolean triggers(Entity e) {
		if (!e.isAlive() || e.isSpectator() || e instanceof net.minecraft.world.entity.item.ItemEntity || e instanceof net.minecraft.world.entity.ExperienceOrb) return false;
		return !(e instanceof dk.ulfen.security.entity.CameraView) && !(e instanceof net.minecraft.world.entity.projectile.Projectile);
	}
}
