package dk.ulfen.security.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.Level;

/** A big, muscular criminal in a tank top: twice as tough, hits hard, hard to push back and not afraid of dogs. */
public class Brute extends Criminal {
	public static final int VARIANTS = 2;

	public Brute(EntityType<? extends Brute> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, 40.0)
			.add(Attributes.MOVEMENT_SPEED, 0.22)
			.add(Attributes.ATTACK_DAMAGE, 7.0)
			.add(Attributes.ATTACK_KNOCKBACK, 1.0)
			.add(Attributes.KNOCKBACK_RESISTANCE, 0.6)
			.add(Attributes.FOLLOW_RANGE, 16.0);
	}

	@Override
	protected int variants() {
		return VARIANTS;
	}

	@Override
	protected boolean fearsDogs() {
		return false;
	}

	@Override
	public float getVoicePitch() {
		return super.getVoicePitch() * 0.65F;
	}
}
