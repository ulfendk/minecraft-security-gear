package dk.ulfen.security.blockentity;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.TimedBombBlock;
import dk.ulfen.security.block.TripwireBombBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

/** Counts an armed bomb down, beeping every second (faster at the end). */
public class TimedBombBlockEntity extends BlockEntity {
	private int fuse;

	public TimedBombBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.TIMED_BOMB_BE, pos, state);
	}

	public void start(int ticks) {
		fuse = ticks;
		setChanged();
	}

	public int fuse() {
		return fuse;
	}

	public static void serverTick(Level level, BlockPos pos, BlockState state, TimedBombBlockEntity be) {
		if (!state.getValue(TimedBombBlock.ARMED)) return;
		if (be.fuse <= 0) be.fuse = TimedBombBlock.SECONDS[state.getValue(TimedBombBlock.TIMER)] * 20;
		be.fuse--;
		if (be.fuse <= 0) {
			TripwireBombBlock.detonate(level, pos);
			return;
		}
		int every = be.fuse < 100 ? 5 : 20;
		if (be.fuse % every == 0) level.playSound(null, pos, SoundEvents.NOTE_BLOCK_HAT.value(), SoundSource.BLOCKS, 1.5F, be.fuse < 100 ? 2.0F : 1.5F);
		if (be.fuse % 20 == 0) be.setChanged();
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		fuse = input.getIntOr("Fuse", 0);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.putInt("Fuse", fuse);
	}
}
