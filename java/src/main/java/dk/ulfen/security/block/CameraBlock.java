package dk.ulfen.security.block;

import java.util.Map;

import dk.ulfen.security.blockentity.CameraBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
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
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A security camera on a wall or hanging from a ceiling. Link it to a monitor
 * with a Camera Linker. Sneak and use it to stop or restart the panning.
 */
public class CameraBlock extends BaseEntityBlock {
	public static final EnumProperty<Direction> FACING = BlockStateProperties.HORIZONTAL_FACING;
	public static final BooleanProperty CEILING = BooleanProperty.create("ceiling");
	private static final Map<Direction, VoxelShape> WALL = Shapes.rotateHorizontal(Block.box(3, 5, 1, 13, 12, 16));
	private static final Map<Direction, VoxelShape> HANGING = Shapes.rotateHorizontal(Block.box(3, 5, 1, 13, 16, 13));

	public CameraBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(CEILING, false));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, CEILING);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		Direction face = ctx.getClickedFace();
		if (face.getAxis().isHorizontal()) return defaultBlockState().setValue(FACING, face);
		return defaultBlockState().setValue(FACING, ctx.getHorizontalDirection()).setValue(CEILING, face == Direction.DOWN);
	}

	@Override
	protected RenderShape getRenderShape(BlockState state) {
		return RenderShape.INVISIBLE;
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return (state.getValue(CEILING) ? HANGING : WALL).get(state.getValue(FACING));
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!player.isShiftKeyDown()) return InteractionResult.PASS;
		if (!level.isClientSide() && level.getBlockEntity(pos) instanceof CameraBlockEntity cam) {
			cam.setStill(!cam.isStill());
			player.sendOverlayMessage(Component.translatable(cam.isStill() ? "secgear.camera.still" : "secgear.camera.panning"));
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
		return new CameraBlockEntity(pos, state);
	}
}
