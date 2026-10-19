package dk.ulfen.security.block;

import java.util.Map;

import dk.ulfen.security.item.KeycardItem;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Swipe a keycard of the required clearance (or higher) for a 2 second redstone
 * pulse, strong into the wall behind it, so it opens a cell door next to that wall.
 * Sneak and use a Warden keycard to change the required clearance.
 */
public class KeycardReaderBlock extends Block {
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;
	public static final IntegerProperty LEVEL = IntegerProperty.create("level", 1, 3);
	private static final Map<Direction, VoxelShape> SHAPES = Shapes.rotateHorizontal(Block.box(4, 2, 14, 12, 14, 16));

	public KeycardReaderBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(POWERED, false).setValue(LEVEL, 1));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, POWERED, LEVEL);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		Direction face = ctx.getClickedFace();
		return defaultBlockState().setValue(FACING, face.getAxis().isHorizontal() ? face : ctx.getHorizontalDirection().getOpposite());
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES.get(state.getValue(FACING));
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player, InteractionHand hand, BlockHitResult hit) {
		int card = stack.getItem() instanceof KeycardItem k ? k.level : 0;
		if (level.isClientSide()) return card > 0 ? InteractionResult.SUCCESS : InteractionResult.TRY_WITH_EMPTY_HAND;
		if (card == 0) return InteractionResult.TRY_WITH_EMPTY_HAND;
		if (player.isShiftKeyDown() && card == 3) {
			int next = state.getValue(LEVEL) % 3 + 1;
			level.setBlock(pos, state.setValue(LEVEL, next), Block.UPDATE_ALL);
			player.sendOverlayMessage(Component.translatable("secgear.reader.level", Component.translatable("secgear.level." + next)));
			return InteractionResult.SUCCESS;
		}
		swipe(level, pos, state, player, card);
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!level.isClientSide()) player.sendOverlayMessage(Component.translatable("secgear.reader.level", Component.translatable("secgear.level." + state.getValue(LEVEL))));
		return InteractionResult.SUCCESS;
	}

	/** Returns true when access is granted. */
	public boolean swipe(Level level, BlockPos pos, BlockState state, Player player, int card) {
		if (card >= state.getValue(LEVEL)) {
			Signals.pulse(level, pos, state, state.getValue(FACING).getOpposite(), 40);
			level.playSound(null, pos, SoundEvents.NOTE_BLOCK_CHIME.value(), SoundSource.BLOCKS, 1.0F, 1.5F);
			if (player != null) player.sendOverlayMessage(Component.translatable("secgear.reader.granted"));
			return true;
		}
		level.playSound(null, pos, SoundEvents.NOTE_BLOCK_BASS.value(), SoundSource.BLOCKS, 1.0F, 0.6F);
		if (player != null) player.sendOverlayMessage(Component.translatable("secgear.reader.denied"));
		return false;
	}

	@Override
	protected void tick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		Signals.tickOff(level, pos, state, state.getValue(FACING).getOpposite());
	}

	@Override
	protected boolean isSignalSource(BlockState state) {
		return true;
	}

	@Override
	protected int getSignal(BlockState state, BlockGetter level, BlockPos pos, Direction direction) {
		return state.getValue(POWERED) ? 15 : 0;
	}

	@Override
	protected int getDirectSignal(BlockState state, BlockGetter level, BlockPos pos, Direction direction) {
		return state.getValue(POWERED) && state.getValue(FACING) == direction ? 15 : 0;
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		if (!movedByPiston && state.getValue(POWERED)) Signals.updateAttached(level, pos, this, state.getValue(FACING).getOpposite());
	}

	@Override
	protected BlockState rotate(BlockState state, Rotation rotation) {
		return state.setValue(FACING, rotation.rotate(state.getValue(FACING)));
	}

	@Override
	protected BlockState mirror(BlockState state, Mirror mirror) {
		return state.rotate(mirror.getRotation(state.getValue(FACING)));
	}
}
