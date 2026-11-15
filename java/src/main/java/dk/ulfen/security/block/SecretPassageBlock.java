package dk.ulfen.security.block;

import net.minecraft.core.BlockPos;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

/** A false wall: looks like the wall it is placed in, but anything can walk straight through. */
public class SecretPassageBlock extends Block {
	public SecretPassageBlock(Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(Disguise.PROPERTY, Disguise.STONE_BRICKS));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(Disguise.PROPERTY);
	}

	@Override
	public BlockState getStateForPlacement(BlockPlaceContext ctx) {
		return defaultBlockState().setValue(Disguise.PROPERTY, Camouflage.disguiseFor(ctx.getLevel(), ctx.getClickedPos(), ctx.getClickedFace()));
	}

	@Override
	protected VoxelShape getCollisionShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return Shapes.empty();
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player, InteractionHand hand, BlockHitResult hit) {
		InteractionResult r = Camouflage.retexture(stack, state, level, pos, player);
		return r != null ? r : InteractionResult.TRY_WITH_EMPTY_HAND;
	}
}
