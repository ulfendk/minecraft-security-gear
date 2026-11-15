package dk.ulfen.security.block;

import java.util.function.Supplier;

import dk.ulfen.security.SecRegistry;
import net.minecraft.util.StringRepresentable;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.properties.EnumProperty;
import org.jspecify.annotations.Nullable;

/** What a camouflaged block looks like. Mirrors src/disguises.mjs (same names, same order). */
public enum Disguise implements StringRepresentable {
	STONE_BRICKS("stone_bricks", () -> Blocks.STONE_BRICKS),
	COBBLESTONE("cobblestone", () -> Blocks.COBBLESTONE),
	STONE("stone", () -> Blocks.STONE),
	MOSSY_STONE_BRICKS("mossy_stone_bricks", () -> Blocks.MOSSY_STONE_BRICKS),
	DEEPSLATE_BRICKS("deepslate_bricks", () -> Blocks.DEEPSLATE_BRICKS),
	BRICKS("bricks", () -> Blocks.BRICKS),
	OAK_PLANKS("oak_planks", () -> Blocks.OAK_PLANKS),
	SPRUCE_PLANKS("spruce_planks", () -> Blocks.SPRUCE_PLANKS),
	BIRCH_PLANKS("birch_planks", () -> Blocks.BIRCH_PLANKS),
	DARK_OAK_PLANKS("dark_oak_planks", () -> Blocks.DARK_OAK_PLANKS),
	SMOOTH_STONE("smooth_stone", () -> Blocks.SMOOTH_STONE),
	ANDESITE("andesite", () -> Blocks.ANDESITE),
	WHITE_CONCRETE("white_concrete", () -> Blocks.CONCRETE.white()),
	REINFORCED_CONCRETE("reinforced_concrete", () -> SecRegistry.REINFORCED_CONCRETE);

	public static final EnumProperty<Disguise> PROPERTY = EnumProperty.create("disguise", Disguise.class);

	private final String name;
	private final Supplier<Block> block;

	Disguise(String name, Supplier<Block> block) {
		this.name = name;
		this.block = block;
	}

	@Override
	public String getSerializedName() {
		return name;
	}

	/** The disguise that copies this block, or null if it isn't one of them. */
	public static @Nullable Disguise forBlock(Block b) {
		for (Disguise d : values()) if (d.block.get() == b) return d;
		return null;
	}
}
