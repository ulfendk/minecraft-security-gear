package dk.ulfen.security.blockentity;

import dk.ulfen.security.SecRegistry;
import dk.ulfen.security.block.BridgeDeckBlock;
import dk.ulfen.security.block.BridgeWinchBlock;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

/** Remembers how much deck the winch has laid out. */
public class WinchBlockEntity extends BlockEntity {
	public static final int MAX_LENGTH = 12, STEP_TICKS = 6;
	private int length;

	public WinchBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.WINCH_BE, pos, state);
	}

	public int length() {
		return length;
	}

	public static void serverTick(Level level, BlockPos pos, BlockState state, WinchBlockEntity be) {
		if (level.getGameTime() % STEP_TICKS != 0) return;
		Direction d = state.getValue(BridgeWinchBlock.FACING);
		if (state.getValue(BridgeWinchBlock.POWERED)) {
			if (be.length >= MAX_LENGTH) return;
			BlockPos next = pos.relative(d, be.length + 1);
			BlockState there = level.getBlockState(next);
			if (!there.canBeReplaced()) return;
			level.setBlock(next, SecRegistry.BRIDGE_DECK.defaultBlockState().setValue(BridgeDeckBlock.FACING, d), Block.UPDATE_ALL);
			be.length++;
			be.setChanged();
			level.playSound(null, next, SoundEvents.WOOD_PLACE, SoundSource.BLOCKS, 0.8F, 1.2F);
			level.playSound(null, pos, SoundEvents.LEVER_CLICK, SoundSource.BLOCKS, 0.5F, 0.7F);
		} else if (be.length > 0) {
			BlockPos last = pos.relative(d, be.length);
			if (level.getBlockState(last).is(SecRegistry.BRIDGE_DECK)) level.removeBlock(last, false);
			be.length--;
			be.setChanged();
			level.playSound(null, pos, SoundEvents.LEVER_CLICK, SoundSource.BLOCKS, 0.5F, 0.6F);
		}
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		length = input.getIntOr("Length", 0);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.putInt("Length", length);
	}
}
