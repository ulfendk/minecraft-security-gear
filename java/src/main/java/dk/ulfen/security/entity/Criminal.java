package dk.ulfen.security.entity;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.animation.object.PlayState;
import com.geckolib.constant.DataTickets;
import com.geckolib.util.GeckoLibUtil;

import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.SpawnGroupData;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.AvoidEntityGoal;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.ServerLevelAccessor;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * A criminal to lock up: a striped convict, an inmate in an orange jumpsuit, a masked
 * burglar or a gangster. Shuffles about, keeps away from guard dogs and hits back
 * when hit. Guards leave criminals alone.
 */
public class Criminal extends PathfinderMob implements GeoEntity, HasVariant {
	private static final EntityDataAccessor<Integer> VARIANT = SynchedEntityData.defineId(Criminal.class, EntityDataSerializers.INT);
	public static final int VARIANTS = 4;
	private static final RawAnimation IDLE = RawAnimation.begin().thenLoop("animation.secgear.criminal.idle");
	private static final RawAnimation WALK = RawAnimation.begin().thenLoop("animation.secgear.criminal.walk");
	private static final RawAnimation RUN = RawAnimation.begin().thenLoop("animation.secgear.criminal.run");
	private static final RawAnimation ATTACK = RawAnimation.begin().thenPlay("animation.secgear.criminal.attack");
	private final AnimatableInstanceCache cache = GeckoLibUtil.createInstanceCache(this);

	public Criminal(EntityType<? extends Criminal> type, Level level) {
		super(type, level);
		this.setPersistenceRequired();
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, 20.0)
			.add(Attributes.MOVEMENT_SPEED, 0.25)
			.add(Attributes.ATTACK_DAMAGE, 3.0)
			.add(Attributes.FOLLOW_RANGE, 16.0);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(2, new MeleeAttackGoal(this, 1.1, true));
		this.goalSelector.addGoal(3, new AvoidEntityGoal<>(this, GuardDog.class, 6.0F, 1.0, 1.3));
		this.goalSelector.addGoal(7, new WaterAvoidingRandomStrollGoal(this, 0.6));
		this.goalSelector.addGoal(8, new LookAtPlayerGoal(this, Player.class, 8.0F));
		this.goalSelector.addGoal(9, new RandomLookAroundGoal(this));
		this.targetSelector.addGoal(1, new HurtByTargetGoal(this));
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(VARIANT, 0);
	}

	@Override
	public int getVariant() {
		return this.entityData.get(VARIANT);
	}

	@Override
	public @Nullable SpawnGroupData finalizeSpawn(ServerLevelAccessor level, DifficultyInstance difficulty, EntitySpawnReason reason, @Nullable SpawnGroupData data) {
		this.entityData.set(VARIANT, level.getRandom().nextInt(VARIANTS));
		return super.finalizeSpawn(level, difficulty, reason, data);
	}

	@Override
	public boolean removeWhenFarAway(double distance) {
		return false;
	}

	@Override
	protected @Nullable SoundEvent getHurtSound(DamageSource source) {
		return SoundEvents.PLAYER_HURT;
	}

	@Override
	protected @Nullable SoundEvent getDeathSound() {
		return SoundEvents.PLAYER_DEATH;
	}

	@Override
	protected void addAdditionalSaveData(ValueOutput output) {
		super.addAdditionalSaveData(output);
		output.putInt("Variant", getVariant());
	}

	@Override
	protected void readAdditionalSaveData(ValueInput input) {
		super.readAdditionalSaveData(input);
		this.entityData.set(VARIANT, input.getIntOr("Variant", 0));
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		controllers.add(new AnimationController<Criminal>("move", 4, state -> {
			Vec3 v = state.getDataOrDefault(DataTickets.VELOCITY, Vec3.ZERO);
			double speed = Math.sqrt(v.x * v.x + v.z * v.z) * 20;
			return state.setAndContinue(speed > 4.5 ? RUN : speed > 0.4 ? WALK : IDLE);
		}));
		controllers.add(new AnimationController<Criminal>("attack", 1, state -> {
			if (state.animatable().isSwinging()) return state.setAndContinue(ATTACK);
			state.controller().reset();
			return PlayState.STOP;
		}));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return cache;
	}
}
