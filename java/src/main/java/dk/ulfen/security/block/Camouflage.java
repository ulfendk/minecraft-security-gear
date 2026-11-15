package dk.ulfen.security.block;

import java.util.ArrayDeque;
import java.util.LinkedHashSet;
import java.util.Set;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import org.jspecify.annotations.Nullable;

/** Shared rules for hidden doors and secret passages: which wall to copy, and changing it. */
public final class Camouflage {
	private static final Direction[] AROUND = {Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST, Direction.UP, Direction.DOWN};
	private static final int MAX_GROUP = 32;

	private Camouflage() {}

	private static @Nullable Disguise of(BlockState s) {
		return s.hasProperty(Disguise.PROPERTY) ? s.getValue(Disguise.PROPERTY) : Disguise.forBlock(s.getBlock());
	}

	/**
	 * The look for a camouflaged block placed at `pos`: the block it was placed against,
	 * else a camouflaged neighbour, else any neighbouring wall block, else stone bricks.
	 */
	public static Disguise disguiseFor(BlockGetter level, BlockPos pos, @Nullable Direction clickedFace) {
		if (clickedFace != null) {
			Disguise d = of(level.getBlockState(pos.relative(clickedFace.getOpposite())));
			if (d != null) return d;
		}
		for (Direction dir : AROUND) {
			BlockState s = level.getBlockState(pos.relative(dir));
			if (s.hasProperty(Disguise.PROPERTY)) return s.getValue(Disguise.PROPERTY);
		}
		for (Direction dir : AROUND) {
			Disguise d = Disguise.forBlock(level.getBlockState(pos.relative(dir)).getBlock());
			if (d != null) return d;
		}
		return Disguise.STONE_BRICKS;
	}

	/** This block and every block of the same kind joined to it (up to 32). */
	public static Set<BlockPos> group(Level level, BlockPos start, Block block) {
		Set<BlockPos> seen = new LinkedHashSet<>();
		ArrayDeque<BlockPos> queue = new ArrayDeque<>();
		queue.add(start);
		while (!queue.isEmpty() && seen.size() < MAX_GROUP) {
			BlockPos p = queue.poll();
			if (!level.getBlockState(p).is(block) || !seen.add(p)) continue;
			for (Direction d : AROUND) queue.add(p.relative(d));
		}
		return seen;
	}

	/** Using one of the disguise blocks on it (not sneaking) gives it and its group that look. Null if the item isn't one. */
	public static @Nullable InteractionResult retexture(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player) {
		if (player.isShiftKeyDown() || !(stack.getItem() instanceof BlockItem item)) return null;
		Disguise d = Disguise.forBlock(item.getBlock());
		if (d == null) return null;
		if (!level.isClientSide()) {
			for (BlockPos p : group(level, pos, state.getBlock())) level.setBlock(p, level.getBlockState(p).setValue(Disguise.PROPERTY, d), Block.UPDATE_ALL);
			level.playSound(null, pos, item.getBlock().defaultBlockState().getSoundType().getPlaceSound(), SoundSource.BLOCKS, 1.0F, 0.8F);
		}
		return InteractionResult.SUCCESS;
	}
}
