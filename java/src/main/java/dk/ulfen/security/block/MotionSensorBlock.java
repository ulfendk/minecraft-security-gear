package dk.ulfen.security.block;

import java.util.Map;

import dk.ulfen.security.entity.SecurityGuard;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Gives a redstone signal while it sees a creature within 8 blocks in front of it.
 * Sneaking players slip past, and guards are ignored.
 */
public class MotionSensorBlock extends Block {
	public static final EnumProperty<Direction> FACING = BlockStateProperties.FACING;
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;
	public static final int RANGE = 8;
	private static final Map<Direction, VoxelShape> SHAPES = Shapes.rotateAll(Shapes.or(Block.box(4, 4, 14, 12, 12, 16), Block.box(5, 5, 12, 11, 11, 14)));

	public MotionSensorBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FACING, Direction.NORTH).setValue(POWERED, false));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FACING, POWERED);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		return defaultBlockState().setValue(FACING, ctx.getClickedFace());
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPES.get(state.getValue(FACING));
	}

	@Override
	protected void onPlace(BlockState state, Level level, BlockPos pos, BlockState oldState, boolean movedByPiston) {
		if (!oldState.is(this)) level.scheduleTick(pos, this, 10);
	}

	@Override
	protected void tick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		boolean seen = sees(level, pos, state.getValue(FACING));
		if (seen != state.getValue(POWERED)) {
			level.setBlock(pos, state.setValue(POWERED, seen), Block.UPDATE_ALL);
			Signals.updateAttached(level, pos, this, state.getValue(FACING).getOpposite());
		}
		level.scheduleTick(pos, this, 10);
	}

	public static boolean sees(Level level, BlockPos pos, Direction facing) {
		Vec3 eye = Vec3.atCenterOf(pos).add(Vec3.atLowerCornerOf(facing.getUnitVec3i()).scale(0.4));
		Vec3 dir = Vec3.atLowerCornerOf(facing.getUnitVec3i());
		for (Entity e : level.getEntities((Entity) null, new AABB(pos).inflate(RANGE), Signals::triggers)) {
			if (!(e instanceof LivingEntity) || e instanceof SecurityGuard) continue;
			if (e instanceof Player p && p.isShiftKeyDown()) continue;
			Vec3 target = e.getBoundingBox().getCenter();
			Vec3 to = target.subtract(eye);
			double dist = to.length();
			if (dist > RANGE || dist < 0.3 || to.normalize().dot(dir) < 0.2) continue;
			BlockHitResult hit = level.clip(new ClipContext(eye, target, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, CollisionContext.empty()));
			if (hit.getType() == HitResult.Type.MISS || hit.getBlockPos().equals(pos)) return true;
		}
		return false;
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
	protected BlockState rotate(BlockState state, Rotation rotation) {
		return state.setValue(FACING, rotation.rotate(state.getValue(FACING)));
	}

	@Override
	protected BlockState mirror(BlockState state, Mirror mirror) {
		return state.rotate(mirror.getRotation(state.getValue(FACING)));
	}
}
