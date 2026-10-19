package dk.ulfen.security.block;

import java.util.Map;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.blockentity.TimedBombBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Explosion;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.level.redstone.Orientation;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;
import org.jspecify.annotations.Nullable;

/**
 * Dynamite on a timer. Use it to pick the fuse (5, 10, 30 or 60 seconds), sneak
 * and use it (or power it) to arm it. It beeps while counting down; shears defuse it.
 */
public class TimedBombBlock extends BaseEntityBlock {
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	public static final BooleanProperty ARMED = BooleanProperty.create("armed");
	public static final IntegerProperty TIMER = IntegerProperty.create("timer", 0, 3);
	public static final int[] SECONDS = {5, 10, 30, 60};
	private static final Map<Direction, VoxelShape> SHAPES = Shapes.rotateHorizontal(Block.box(1, 0, 3, 15, 9, 12));

	public TimedBombBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(ARMED, false).setValue(TIMER, 1));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, ARMED, TIMER);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		return defaultBlockState().setValue(FACING, ctx.getHorizontalDirection().getOpposite());
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES.get(state.getValue(FACING));
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player, InteractionHand hand, BlockHitResult hit) {
		if (!stack.is(Items.SHEARS) || !state.getValue(ARMED)) return InteractionResult.TRY_WITH_EMPTY_HAND;
		if (!level.isClientSide()) {
			level.setBlock(pos, state.setValue(ARMED, false), Block.UPDATE_ALL);
			level.playSound(null, pos, SoundEvents.SHEEP_SHEAR, SoundSource.BLOCKS, 1.0F, 1.0F);
			player.sendOverlayMessage(Component.translatable("secgear.bomb.defused"));
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (state.getValue(ARMED)) return InteractionResult.PASS;
		if (level.isClientSide()) return InteractionResult.SUCCESS;
		if (player.isShiftKeyDown()) {
			arm(level, pos, state, player);
		} else {
			int next = (state.getValue(TIMER) + 1) % SECONDS.length;
			level.setBlock(pos, state.setValue(TIMER, next), Block.UPDATE_ALL);
			level.playSound(null, pos, SoundEvents.UI_BUTTON_CLICK.value(), SoundSource.BLOCKS, 0.5F, 1.4F);
			player.sendOverlayMessage(Component.translatable("secgear.bomb.timer", SECONDS[next]));
		}
		return InteractionResult.SUCCESS;
	}

	public static void arm(Level level, BlockPos pos, BlockState state, @Nullable Player player) {
		int seconds = SECONDS[state.getValue(TIMER)];
		level.setBlock(pos, state.setValue(ARMED, true), Block.UPDATE_ALL);
		if (level.getBlockEntity(pos) instanceof TimedBombBlockEntity be) be.start(seconds * 20);
		level.playSound(null, pos, SoundEvents.TNT_PRIMED, SoundSource.BLOCKS, 1.0F, 1.0F);
		if (player != null) player.sendOverlayMessage(Component.translatable("secgear.bomb.armed", seconds));
	}

	@Override
	protected void neighborChanged(BlockState state, Level level, BlockPos pos, Block block, @Nullable Orientation orientation, boolean movedByPiston) {
		if (!level.isClientSide() && !state.getValue(ARMED) && level.hasNeighborSignal(pos)) arm(level, pos, state, null);
	}

	@Override
	public void wasExploded(ServerLevel level, BlockPos pos, Explosion explosion) {
		level.getServer().execute(() -> TripwireBombBlock.explode(level, pos, 4.0F));
	}

	@Override
	protected BlockState rotate(BlockState state, Rotation rotation) {
		return state.setValue(FACING, rotation.rotate(state.getValue(FACING)));
	}

	@Override
	protected BlockState mirror(BlockState state, Mirror mirror) {
		return state.rotate(mirror.getRotation(state.getValue(FACING)));
	}

	@Override
	public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
		return new TimedBombBlockEntity(pos, state);
	}

	@Override
	public <T extends BlockEntity> @Nullable BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
		return level.isClientSide() ? null : createTickerHelper(type, SecRegistry.TIMED_BOMB_BE, TimedBombBlockEntity::serverTick);
	}
}
