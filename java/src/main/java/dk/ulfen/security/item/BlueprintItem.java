package dk.ulfen.security.item;

import dk.ulfen.security.structure.Blueprints;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;

/** Builds a guard tower, prison cell or gatehouse in front of you. */
public class BlueprintItem extends Item {
	public final String structure;

	public BlueprintItem(Properties properties, String structure) {
		super(properties);
		this.structure = structure;
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
		Player player = ctx.getPlayer();
		Direction facing = ctx.getHorizontalDirection();
		BlockPos base = ctx.getClickedPos().relative(ctx.getClickedFace());
		int placed = Blueprints.build(level, structure, base, facing);
		if (placed < 0) {
			if (player != null) player.sendOverlayMessage(Component.translatable("secgear.blueprint.blocked"));
			level.playSound(null, base, SoundEvents.NOTE_BLOCK_BASS.value(), SoundSource.PLAYERS, 1.0F, 0.6F);
			return InteractionResult.FAIL;
		}
		if (player != null) {
			player.sendOverlayMessage(Component.translatable("secgear.blueprint.built", ctx.getItemInHand().getHoverName()));
			if (!player.isCreative()) ctx.getItemInHand().shrink(1);
		}
		level.playSound(null, base, SoundEvents.PLAYER_LEVELUP, SoundSource.PLAYERS, 0.5F, 1.2F);
		return InteractionResult.SUCCESS;
	}
}
