package dk.ulfen.security.block;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.InsideBlockEffectApplier;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/** Barbed and razor wire: slows down whatever pushes through it, and cuts. */
public class WireBlock extends Block {
	private static final VoxelShape SHAPE = Block.box(1, 0, 1, 15, 14, 15);
	private final float damage;

	public WireBlock(Properties properties, float damage) {
		super(properties);
		this.damage = damage;
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	protected void entityInside(BlockState state, Level level, BlockPos pos, Entity entity, InsideBlockEffectApplier effectApplier, boolean isPrecise) {
		entity.makeStuckInBlock(state, new Vec3(0.35, 0.3, 0.35));
		if (level instanceof ServerLevel server && entity instanceof LivingEntity living && level.getGameTime() % 10 == 0) {
			living.hurtServer(server, level.damageSources().cactus(), damage);
		}
	}
}
