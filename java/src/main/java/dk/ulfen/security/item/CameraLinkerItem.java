package dk.ulfen.security.item;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;

/** Use it on cameras to remember them, then on a monitor to link them all to it. */
public class CameraLinkerItem extends Item {
	public CameraLinkerItem(Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		Level level = ctx.getLevel();
		BlockPos pos = ctx.getClickedPos();
		Player player = ctx.getPlayer();
		ItemStack stack = ctx.getItemInHand();
		List<BlockPos> stored = new ArrayList<>(stack.getOrDefault(SecRegistry.LINKED_CAMERAS, List.of()));
		if (level.getBlockState(pos).is(SecRegistry.SECURITY_CAMERA)) {
			if (level.isClientSide()) return InteractionResult.SUCCESS;
			if (stored.contains(pos)) {
				tell(player, Component.translatable("secgear.linker.known", stored.size()));
			} else if (stored.size() >= MonitorBlockEntity.MAX_CAMERAS) {
				tell(player, Component.translatable("secgear.linker.full"));
			} else {
				stored.add(pos.immutable());
				stack.set(SecRegistry.LINKED_CAMERAS, List.copyOf(stored));
				level.playSound(null, pos, SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS, 0.5F, 1.4F);
				tell(player, Component.translatable("secgear.linker.added", stored.size()));
			}
			return InteractionResult.SUCCESS;
		}
		if (level.getBlockEntity(pos) instanceof MonitorBlockEntity monitor) {
			if (level.isClientSide()) return InteractionResult.SUCCESS;
			if (stored.isEmpty()) {
				tell(player, Component.translatable("secgear.linker.empty"));
				return InteractionResult.SUCCESS;
			}
			int count = monitor.link(stored);
			stack.remove(SecRegistry.LINKED_CAMERAS);
			level.playSound(null, pos, SoundEvents.PLAYER_LEVELUP, SoundSource.PLAYERS, 0.4F, 1.6F);
			tell(player, Component.translatable("secgear.linker.linked", count));
			return InteractionResult.SUCCESS;
		}
		return InteractionResult.PASS;
	}

	@Override
	public boolean isFoil(ItemStack stack) {
		return !stack.getOrDefault(SecRegistry.LINKED_CAMERAS, List.of()).isEmpty();
	}

	private static void tell(Player player, Component message) {
		if (player != null) player.sendOverlayMessage(message);
	}
}
