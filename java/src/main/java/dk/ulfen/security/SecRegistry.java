package dk.ulfen.security;

import java.util.List;
import java.util.function.Function;

import dk.ulfen.security.block.AlarmSirenBlock;
import dk.ulfen.security.block.BridgeDeckBlock;
import dk.ulfen.security.block.BridgeWinchBlock;
import dk.ulfen.security.block.CameraBlock;
import dk.ulfen.security.block.KeycardReaderBlock;
import dk.ulfen.security.block.LaserEmitterBlock;
import dk.ulfen.security.block.LaserReceiverBlock;
import dk.ulfen.security.block.MonitorBlock;
import dk.ulfen.security.block.MotionSensorBlock;
import dk.ulfen.security.block.PitTrapdoorBlock;
import dk.ulfen.security.block.SearchlightBlock;
import dk.ulfen.security.block.TimedBombBlock;
import dk.ulfen.security.block.TripwireBombBlock;
import dk.ulfen.security.block.WireBlock;
import dk.ulfen.security.blockentity.CameraBlockEntity;
import dk.ulfen.security.blockentity.LaserBlockEntity;
import dk.ulfen.security.blockentity.MonitorBlockEntity;
import dk.ulfen.security.blockentity.SearchlightBlockEntity;
import dk.ulfen.security.blockentity.TimedBombBlockEntity;
import dk.ulfen.security.blockentity.WinchBlockEntity;
import dk.ulfen.security.entity.CameraView;
import dk.ulfen.security.entity.Criminal;
import dk.ulfen.security.entity.GuardDog;
import dk.ulfen.security.entity.SecurityGuard;
import dk.ulfen.security.item.BatonItem;
import dk.ulfen.security.item.BlueprintItem;
import dk.ulfen.security.item.CameraLinkerItem;
import dk.ulfen.security.item.KeycardItem;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.fabricmc.fabric.api.object.builder.v1.block.entity.FabricBlockEntityTypeBuilder;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Registry;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.DoubleHighBlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SpawnEggItem;
import net.minecraft.world.item.ToolMaterial;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.DoorBlock;
import net.minecraft.world.level.block.IronBarsBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.WallBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.properties.BlockSetType;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.level.material.PushReaction;

/** Everything the mod adds to the game registries. */
public final class SecRegistry {
	// Blocks
	public static Block REINFORCED_CONCRETE, PRISON_WALL, PRISON_BARS, BARBED_WIRE, RAZOR_WIRE, CELL_DOOR;
	public static Block SECURITY_CAMERA, MONITOR, LASER_EMITTER, LASER_FENCE, LASER_RECEIVER, MOTION_SENSOR, ALARM_SIREN, SEARCHLIGHT;
	public static Block KEYCARD_READER, PIT_TRAPDOOR, BRIDGE_WINCH, BRIDGE_DECK, TIMED_BOMB, TRIPWIRE_BOMB;

	// Block entities
	public static BlockEntityType<CameraBlockEntity> CAMERA_BE;
	public static BlockEntityType<MonitorBlockEntity> MONITOR_BE;
	public static BlockEntityType<LaserBlockEntity> LASER_BE;
	public static BlockEntityType<SearchlightBlockEntity> SEARCHLIGHT_BE;
	public static BlockEntityType<WinchBlockEntity> WINCH_BE;
	public static BlockEntityType<TimedBombBlockEntity> TIMED_BOMB_BE;

	// Entities
	public static EntityType<SecurityGuard> SECURITY_GUARD;
	public static EntityType<Criminal> CRIMINAL;
	public static EntityType<GuardDog> GUARD_DOG;
	public static EntityType<CameraView> CAMERA_VIEW;

	// Items
	public static Item CAMERA_LINKER, GUARD_KEYCARD, OFFICER_KEYCARD, WARDEN_KEYCARD, BATON;
	public static Item GUARD_TOWER_BLUEPRINT, PRISON_CELL_BLUEPRINT, GATEHOUSE_BLUEPRINT;
	public static Item SECURITY_GUARD_SPAWN_EGG, CRIMINAL_SPAWN_EGG, GUARD_DOG_SPAWN_EGG;

	/** Camera positions stored in a Camera Linker. */
	public static final DataComponentType<List<BlockPos>> LINKED_CAMERAS = Registry.register(BuiltInRegistries.DATA_COMPONENT_TYPE, id("linked_cameras"),
		DataComponentType.<List<BlockPos>>builder().persistent(BlockPos.CODEC.listOf()).networkSynchronized(BlockPos.STREAM_CODEC.apply(ByteBufCodecs.list())).build());

	private SecRegistry() {}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(SecurityGear.MOD_ID, path);
	}

	static void register() {
		registerBlocks();
		registerBlockEntities();
		registerEntities();
		registerItems();
		registerCreativeTab();
	}

	// ---------------------------------------------------------------- blocks

	private static Block block(String name, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		Block b = blockOnly(name, factory, props);
		item(name, p -> new BlockItem(b, p), new Item.Properties().useBlockDescriptionPrefix());
		return b;
	}

	private static Block blockOnly(String name, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, id(name));
		return Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(props.setId(key)));
	}

	private static BlockBehaviour.Properties metal(float strength) {
		return BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(strength, 6.0F).sound(SoundType.METAL).requiresCorrectToolForDrops();
	}

	private static BlockBehaviour.Properties device() {
		return BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_GRAY).strength(1.5F, 6.0F).sound(SoundType.METAL).noOcclusion().pushReaction(PushReaction.POPPED);
	}

	private static void registerBlocks() {
		REINFORCED_CONCRETE = block("reinforced_concrete", Block::new, BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(25.0F, 1200.0F).requiresCorrectToolForDrops());
		PRISON_WALL = block("prison_wall", WallBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(25.0F, 1200.0F).requiresCorrectToolForDrops().forceSolidOn());
		PRISON_BARS = block("prison_bars", IronBarsBlock::new, metal(10.0F).strength(10.0F, 1200.0F).noOcclusion());
		BARBED_WIRE = block("barbed_wire", p -> new WireBlock(p, 1.0F), BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(2.0F).sound(SoundType.CHAIN).noCollision().noOcclusion().requiresCorrectToolForDrops());
		RAZOR_WIRE = block("razor_wire", p -> new WireBlock(p, 3.0F), BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(2.5F).sound(SoundType.CHAIN).noCollision().noOcclusion().requiresCorrectToolForDrops());
		CELL_DOOR = blockOnly("cell_door", p -> new DoorBlock(BlockSetType.IRON, p), metal(5.0F).noOcclusion().pushReaction(PushReaction.POPPED));
		item("cell_door", p -> new DoubleHighBlockItem(CELL_DOOR, p), new Item.Properties().useBlockDescriptionPrefix());

		SECURITY_CAMERA = block("security_camera", CameraBlock::new, device().strength(1.0F, 6.0F));
		MONITOR = block("monitor", MonitorBlock::new, device().lightLevel(s -> 4));
		LASER_EMITTER = block("laser_emitter", p -> new LaserEmitterBlock(p, false), device().lightLevel(s -> 7));
		LASER_FENCE = block("laser_fence", p -> new LaserEmitterBlock(p, true), device().lightLevel(s -> 7));
		LASER_RECEIVER = block("laser_receiver", LaserReceiverBlock::new, device());
		MOTION_SENSOR = block("motion_sensor", MotionSensorBlock::new, device().sound(SoundType.STONE).strength(1.0F));
		ALARM_SIREN = block("alarm_siren", AlarmSirenBlock::new, device().lightLevel(s -> s.getValue(AlarmSirenBlock.POWERED) ? 13 : 0));
		SEARCHLIGHT = block("searchlight", SearchlightBlock::new, device().strength(2.0F, 6.0F).lightLevel(s -> s.getValue(SearchlightBlock.POWERED) ? 15 : 0));
		KEYCARD_READER = block("keycard_reader", KeycardReaderBlock::new, device().strength(5.0F, 1200.0F));
		PIT_TRAPDOOR = block("pit_trapdoor", PitTrapdoorBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(2.0F, 6.0F).requiresCorrectToolForDrops().noOcclusion().isRedstoneConductor((s, l, p) -> false));
		BRIDGE_WINCH = block("bridge_winch", BridgeWinchBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.WOOD).strength(2.5F).sound(SoundType.WOOD));
		BRIDGE_DECK = blockOnly("bridge_deck", BridgeDeckBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.WOOD).strength(1.0F).sound(SoundType.WOOD).noOcclusion().noLootTable().pushReaction(PushReaction.IMMOVEABLE));
		TIMED_BOMB = block("timed_bomb", TimedBombBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.FIRE).instabreak().sound(SoundType.GRASS).noOcclusion().pushReaction(PushReaction.POPPED));
		TRIPWIRE_BOMB = block("tripwire_bomb", TripwireBombBlock::new, BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_GREEN).instabreak().sound(SoundType.GRASS).noOcclusion().pushReaction(PushReaction.POPPED));
	}

	private static <T extends BlockEntity> BlockEntityType<T> blockEntity(String name, FabricBlockEntityTypeBuilder.Factory<T> factory, Block... blocks) {
		return Registry.register(BuiltInRegistries.BLOCK_ENTITY_TYPE, id(name), FabricBlockEntityTypeBuilder.<T>create(factory, blocks).build());
	}

	private static void registerBlockEntities() {
		CAMERA_BE = blockEntity("security_camera", CameraBlockEntity::new, SECURITY_CAMERA);
		MONITOR_BE = blockEntity("monitor", MonitorBlockEntity::new, MONITOR);
		LASER_BE = blockEntity("laser", LaserBlockEntity::new, LASER_EMITTER, LASER_FENCE, TRIPWIRE_BOMB);
		SEARCHLIGHT_BE = blockEntity("searchlight", SearchlightBlockEntity::new, SEARCHLIGHT);
		WINCH_BE = blockEntity("bridge_winch", WinchBlockEntity::new, BRIDGE_WINCH);
		TIMED_BOMB_BE = blockEntity("timed_bomb", TimedBombBlockEntity::new, TIMED_BOMB);
	}

	// ---------------------------------------------------------------- entities

	private static <T extends Entity> EntityType<T> entity(String name, EntityType.Builder<T> builder) {
		ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, id(name));
		return Registry.register(BuiltInRegistries.ENTITY_TYPE, key, builder.build(key));
	}

	private static void registerEntities() {
		SECURITY_GUARD = entity("security_guard", EntityType.Builder.<SecurityGuard>of(SecurityGuard::new, MobCategory.CREATURE).sized(0.6F, 1.95F).clientTrackingRange(10));
		CRIMINAL = entity("criminal", EntityType.Builder.<Criminal>of(Criminal::new, MobCategory.CREATURE).sized(0.6F, 1.95F).clientTrackingRange(10));
		GUARD_DOG = entity("guard_dog", EntityType.Builder.<GuardDog>of(GuardDog::new, MobCategory.CREATURE).sized(0.7F, 0.9F).clientTrackingRange(10));
		CAMERA_VIEW = entity("camera_view", EntityType.Builder.<CameraView>of(CameraView::new, MobCategory.MISC).noLootTable().noSave().sized(0.1F, 0.1F).clientTrackingRange(16).updateInterval(1));
		FabricDefaultAttributeRegistry.register(SECURITY_GUARD, SecurityGuard.createAttributes());
		FabricDefaultAttributeRegistry.register(CRIMINAL, Criminal.createAttributes());
		FabricDefaultAttributeRegistry.register(GUARD_DOG, GuardDog.createAttributes());
	}

	// ---------------------------------------------------------------- items

	private static <T extends Item> T item(String name, Function<Item.Properties, T> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}

	private static void registerItems() {
		CAMERA_LINKER = item("camera_linker", CameraLinkerItem::new, new Item.Properties().stacksTo(1));
		GUARD_KEYCARD = item("guard_keycard", p -> new KeycardItem(p, 1), new Item.Properties().stacksTo(1));
		OFFICER_KEYCARD = item("officer_keycard", p -> new KeycardItem(p, 2), new Item.Properties().stacksTo(1));
		WARDEN_KEYCARD = item("warden_keycard", p -> new KeycardItem(p, 3), new Item.Properties().stacksTo(1));
		GUARD_TOWER_BLUEPRINT = item("guard_tower_blueprint", p -> new BlueprintItem(p, "guard_tower"), new Item.Properties().stacksTo(16));
		PRISON_CELL_BLUEPRINT = item("prison_cell_blueprint", p -> new BlueprintItem(p, "prison_cell"), new Item.Properties().stacksTo(16));
		GATEHOUSE_BLUEPRINT = item("gatehouse_blueprint", p -> new BlueprintItem(p, "gatehouse"), new Item.Properties().stacksTo(16));
		BATON = item("baton", BatonItem::new, new Item.Properties().sword(ToolMaterial.IRON, 2.0F, -2.2F).durability(250));
		SECURITY_GUARD_SPAWN_EGG = item("security_guard_spawn_egg", SpawnEggItem::new, new Item.Properties().spawnEgg(SECURITY_GUARD));
		CRIMINAL_SPAWN_EGG = item("criminal_spawn_egg", SpawnEggItem::new, new Item.Properties().spawnEgg(CRIMINAL));
		GUARD_DOG_SPAWN_EGG = item("guard_dog_spawn_egg", SpawnEggItem::new, new Item.Properties().spawnEgg(GUARD_DOG));
	}

	private static void registerCreativeTab() {
		CreativeModeTab tab = FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.secgear"))
			.icon(() -> new ItemStack(SECURITY_CAMERA))
			.displayItems((params, out) -> {
				for (Block b : new Block[] {SECURITY_CAMERA, MONITOR, LASER_EMITTER, LASER_FENCE, LASER_RECEIVER, MOTION_SENSOR, ALARM_SIREN, SEARCHLIGHT,
					KEYCARD_READER, CELL_DOOR, PRISON_BARS, PRISON_WALL, REINFORCED_CONCRETE, BARBED_WIRE, RAZOR_WIRE, PIT_TRAPDOOR, BRIDGE_WINCH,
					TIMED_BOMB, TRIPWIRE_BOMB}) out.accept(b);
				for (Item i : new Item[] {CAMERA_LINKER, GUARD_KEYCARD, OFFICER_KEYCARD, WARDEN_KEYCARD, BATON, GUARD_TOWER_BLUEPRINT, PRISON_CELL_BLUEPRINT,
					GATEHOUSE_BLUEPRINT, SECURITY_GUARD_SPAWN_EGG, CRIMINAL_SPAWN_EGG, GUARD_DOG_SPAWN_EGG}) out.accept(i);
			})
			.build();
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, id("secgear"), tab);
	}
}
