package dk.ulfen.security.block;

import java.util.Map;

import dk.ulfen.security.CameraViews;
import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Shows the live picture of a linked camera. Use it to look through the camera
 * (sneak to leave); sneak and use it to switch to the next camera.
 */
public class MonitorBlock extends BaseEntityBlock {
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	private static final Map<Direction, VoxelShape> SHAPES = Shapes.rotateHorizontal(Shapes.or(Block.box(1, 1, 4, 15, 13, 12), Block.box(3, 3, 12, 13, 11, 15), Block.box(5, 0, 6, 11, 1, 11)));

	public MonitorBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		return defaultBlockState().setValue(FACING, ctx.getHorizontalDirection().getOpposite());
	}

	@Override
	protected RenderShape getRenderShape(BlockState state) {
		return RenderShape.MODEL;
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES.get(state.getValue(FACING));
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		// Vanilla calls this even with an item in hand; let the Camera Linker handle its own use.
		if (player.getMainHandItem().is(SecRegistry.CAMERA_LINKER)) return InteractionResult.PASS;
		if (level.isClientSide() || !(level.getBlockEntity(pos) instanceof MonitorBlockEntity monitor)) return InteractionResult.SUCCESS;
		monitor.prune(p -> level.getBlockState(p).is(SecRegistry.SECURITY_CAMERA));
		int count = monitor.cameras().size();
		if (count == 0) {
			player.sendOverlayMessage(Component.translatable("secgear.monitor.none"));
		} else if (player.isShiftKeyDown()) {
			monitor.next();
			player.sendOverlayMessage(Component.translatable("secgear.monitor.showing", monitor.index() + 1, count));
		} else if (player instanceof ServerPlayer sp) {
			CameraViews.start(sp, monitor);
		}
		return InteractionResult.SUCCESS;
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
		return new MonitorBlockEntity(pos, state);
	}
}
