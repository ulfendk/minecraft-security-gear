package dk.ulfen.security.item;

import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

/** A guard's baton: a hit slows the target down for three seconds. */
public class BatonItem extends Item {
	public BatonItem(Properties properties) {
		super(properties);
	}

	@Override
	public void hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
		target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 60, 1), attacker);
		super.hurtEnemy(stack, target, attacker);
	}
}
