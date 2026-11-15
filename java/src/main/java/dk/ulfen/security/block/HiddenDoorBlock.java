package dk.ulfen.security.block;

import java.util.Set;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.redstone.Orientation;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;
import org.jspecify.annotations.Nullable;

/**
 * Looks like the wall it is built into. Redstone or a keycard reader (and, for the
 * plain hidden door, a hand) opens it together with every hidden door joined to it;
 * they close again 3 seconds after the signal stops, once the doorway is clear.
 */
public class HiddenDoorBlock extends Block {
	public static final BooleanProperty OPEN = BlockStateProperties.OPEN;
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;
	private final boolean handOpens;

	public HiddenDoorBlock(Properties properties, boolean handOpens) {
		super(properties);
		this.handOpens = handOpens;
		registerDefaultState(stateDefinition.any().setValue(Disguise.PROPERTY, Disguise.STONE_BRICKS).setValue(OPEN, false).setValue(POWERED, false));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(Disguise.PROPERTY, OPEN, POWERED);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		return defaultBlockState().setValue(Disguise.PROPERTY, Camouflage.disguiseFor(ctx.getLevel(), ctx.getClickedPos(), ctx.getClickedFace()));
	}

	@Override
	protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return state.getValue(OPEN) ? Shapes.empty() : Shapes.block();
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player, InteractionHand hand, BlockHitResult hit) {
		InteractionResult r = Camouflage.retexture(stack, state, level, pos, player);
		return r != null ? r : InteractionResult.TRY_WITH_EMPTY_HAND;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!handOpens) return InteractionResult.PASS;
		if (!level.isClientSide() && !state.getValue(OPEN)) open(level, pos);
		return InteractionResult.SUCCESS;
	}

	@Override
	protected void neighborChanged(BlockState state, Level level, BlockPos pos, Block block, @Nullable Orientation orientation, boolean movedByPiston) {
		boolean signal = level.hasNeighborSignal(pos);
		if (signal == state.getValue(POWERED)) return;
		level.setBlock(pos, state.setValue(POWERED, signal), Block.UPDATE_CLIENTS);
		if (signal) open(level, pos);
	}

	/** Open the whole door: every hidden door of this kind joined to this one. */
	public static void open(Level level, BlockPos start) {
		Block block = level.getBlockState(start).getBlock();
		for (BlockPos p : Camouflage.group(level, start, block)) {
			BlockState s = level.getBlockState(p);
			if (!s.getValue(OPEN)) level.setBlock(p, s.setValue(OPEN, true), Block.UPDATE_ALL);
		}
		level.scheduleTick(start, block, 60);
		level.playSound(null, start, SoundEvents.PISTON_CONTRACT, SoundSource.BLOCKS, 0.6F, 0.7F);
	}

	@Override
	protected void tick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		if (!state.getValue(OPEN)) return;
		Set<BlockPos> door = Camouflage.group(level, pos, this);
		boolean busy = false;
		for (BlockPos p : door) {
			busy |= level.getBlockState(p).getValue(POWERED) || !level.getEntities((Entity) null, new AABB(p), Signals::triggers).isEmpty();
		}
		if (busy) {
			level.scheduleTick(pos, this, 20);
			return;
		}
		for (BlockPos p : door) {
			BlockState s = level.getBlockState(p);
			if (s.getValue(OPEN)) level.setBlock(p, s.setValue(OPEN, false), Block.UPDATE_ALL);
		}
		level.playSound(null, pos, SoundEvents.PISTON_EXTEND, SoundSource.BLOCKS, 0.6F, 0.7F);
	}
}
