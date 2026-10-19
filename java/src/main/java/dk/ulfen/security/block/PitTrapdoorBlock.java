package dk.ulfen.security.block;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Set;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.redstone.Orientation;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;
import org.jspecify.annotations.Nullable;

/**
 * Looks like stone bricks. When something (other than a sneaking player) steps
 * on it, it and every pit trapdoor joined to it swing open; they close again
 * after 3 seconds once the pit's mouth is clear. Redstone holds them open.
 */
public class PitTrapdoorBlock extends Block {
	public static final BooleanProperty OPEN = BlockStateProperties.OPEN;
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;
	private static final VoxelShape OPEN_SHAPE = Shapes.or(Block.box(0, 8, 0, 16, 16, 2), Block.box(0, 8, 14, 16, 16, 16));
	private static final int MAX_PIT = 49;

	public PitTrapdoorBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(OPEN, false).setValue(POWERED, false));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(OPEN, POWERED);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return state.getValue(OPEN) ? OPEN_SHAPE : Shapes.block();
	}

	@Override
	protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return state.getValue(OPEN) ? Shapes.empty() : Shapes.block();
	}

	@Override
	public void stepOn(Level level, BlockPos pos, BlockState state, Entity entity) {
		if (level.isClientSide() || state.getValue(OPEN) || !Signals.triggers(entity)) return;
		if (entity instanceof Player p && p.isShiftKeyDown()) return;
		openPit(level, pos);
	}

	@Override
	protected void neighborChanged(BlockState state, Level level, BlockPos pos, Block block, @Nullable Orientation orientation, boolean movedByPiston) {
		boolean signal = level.hasNeighborSignal(pos);
		if (signal == state.getValue(POWERED)) return;
		level.setBlock(pos, state.setValue(POWERED, signal), Block.UPDATE_CLIENTS);
		if (signal) openPit(level, pos);
	}

	/** Open the whole pit: every pit trapdoor joined to this one. */
	public static void openPit(Level level, BlockPos start) {
		Set<BlockPos> seen = new HashSet<>();
		ArrayDeque<BlockPos> queue = new ArrayDeque<>();
		queue.add(start);
		while (!queue.isEmpty() && seen.size() < MAX_PIT) {
			BlockPos p = queue.poll();
			BlockState s = level.getBlockState(p);
			if (!(s.getBlock() instanceof PitTrapdoorBlock) || !seen.add(p)) continue;
			if (!s.getValue(OPEN)) level.setBlock(p, s.setValue(OPEN, true), Block.UPDATE_ALL);
			level.scheduleTick(p, s.getBlock(), 60);
			for (Direction d : Direction.Plane.HORIZONTAL) queue.add(p.relative(d));
		}
		level.playSound(null, start, SoundEvents.IRON_TRAPDOOR_OPEN, SoundSource.BLOCKS, 1.0F, 0.6F);
	}

	@Override
	protected void tick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		if (!state.getValue(OPEN)) return;
		boolean busy = state.getValue(POWERED) || !level.getEntities((Entity) null, new AABB(pos).expandTowards(0, 1, 0), Signals::triggers).isEmpty();
		if (busy) {
			level.scheduleTick(pos, this, 20);
			return;
		}
		level.setBlock(pos, state.setValue(OPEN, false), Block.UPDATE_ALL);
		level.playSound(null, pos, SoundEvents.IRON_TRAPDOOR_CLOSE, SoundSource.BLOCKS, 0.6F, 0.6F);
	}
}
