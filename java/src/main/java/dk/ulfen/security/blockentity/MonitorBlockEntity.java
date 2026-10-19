package dk.ulfen.security.blockentity;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.security.SecRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import org.jspecify.annotations.Nullable;

/** The cameras linked to a monitor and which one it shows. */
public class MonitorBlockEntity extends SyncedBlockEntity {
	public static final int MAX_CAMERAS = 8;
	private final List<BlockPos> cameras = new ArrayList<>();
	private int index;

	public MonitorBlockEntity(BlockPos pos, BlockState state) {
		super(SecRegistry.MONITOR_BE, pos, state);
	}

	public List<BlockPos> cameras() {
		return cameras;
	}

	public int index() {
		return cameras.isEmpty() ? 0 : Math.floorMod(index, cameras.size());
	}

	public @Nullable BlockPos current() {
		return cameras.isEmpty() ? null : cameras.get(index());
	}

	/** Add cameras (no duplicates, at most 8). Returns how many are linked now. */
	public int link(List<BlockPos> more) {
		for (BlockPos p : more) if (!cameras.contains(p) && cameras.size() < MAX_CAMERAS) cameras.add(p.immutable());
		sync();
		return cameras.size();
	}

	public void next() {
		index = cameras.isEmpty() ? 0 : (index() + 1) % cameras.size();
		sync();
	}

	/** Forget cameras that are gone. */
	public void prune(java.util.function.Predicate<BlockPos> exists) {
		if (cameras.removeIf(p -> !exists.test(p))) sync();
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		cameras.clear();
		cameras.addAll(input.read("Cameras", BlockPos.CODEC.listOf()).orElse(List.of()));
		index = input.getIntOr("Index", 0);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.store("Cameras", BlockPos.CODEC.listOf(), List.copyOf(cameras));
		output.putInt("Index", index);
	}
}
