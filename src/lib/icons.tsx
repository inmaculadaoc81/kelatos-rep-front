/**
 * Reexporta los iconos de iconsax-react usados en el proyecto, cada uno
 * envuelto para forzar color/variant explícitos.
 *
 * iconsax-react define sus valores por defecto (color/variant/size) vía
 * `Componente.defaultProps` sobre un componente creado con forwardRef —
 * React 19 eliminó por completo el soporte de defaultProps en componentes
 * de función, así que esos valores nunca llegan y el SVG (solo contorno,
 * sin relleno) se renderiza sin "stroke": invisible. Este wrapper pasa
 * los valores explícitamente en cada render, sin depender de esa
 * característica retirada.
 */
import type { ComponentType } from "react";
import type { IconProps } from "iconsax-react";
import * as Iconsax from "iconsax-react";

function withDefaults(IconComponent: ComponentType<IconProps>): ComponentType<IconProps> {
  function Wrapped(props: IconProps) {
    return <IconComponent color="currentColor" variant="Linear" {...props} />;
  }
  Wrapped.displayName = `WithDefaults(${IconComponent.displayName || "Icon"})`;
  return Wrapped;
}

export type Icon = ComponentType<IconProps>;

export const Add = withDefaults(Iconsax.Add);
export const AddCircle = withDefaults(Iconsax.AddCircle);
export const ArrowDown2 = withDefaults(Iconsax.ArrowDown2);
export const ArrowRotateLeft = withDefaults(Iconsax.ArrowRotateLeft);
export const ArrowSwapHorizontal = withDefaults(Iconsax.ArrowSwapHorizontal);
export const Box = withDefaults(Iconsax.Box);
export const Box1 = withDefaults(Iconsax.Box1);
export const BoxRemove = withDefaults(Iconsax.BoxRemove);
export const BoxSearch = withDefaults(Iconsax.BoxSearch);
export const BoxTick = withDefaults(Iconsax.BoxTick);
export const Calendar = withDefaults(Iconsax.Calendar);
export const Call = withDefaults(Iconsax.Call);
export const Camera = withDefaults(Iconsax.Camera);
export const Category = withDefaults(Iconsax.Category);
export const Category2 = withDefaults(Iconsax.Category2);
export const Chart = withDefaults(Iconsax.Chart);
export const ClipboardText = withDefaults(Iconsax.ClipboardText);
export const ClipboardTick = withDefaults(Iconsax.ClipboardTick);
export const Clock = withDefaults(Iconsax.Clock);
export const CloseCircle = withDefaults(Iconsax.CloseCircle);
export const CloseSquare = withDefaults(Iconsax.CloseSquare);
export const Copy = withDefaults(Iconsax.Copy);
export const Danger = withDefaults(Iconsax.Danger);
export const DocumentText = withDefaults(Iconsax.DocumentText);
export const Edit = withDefaults(Iconsax.Edit);
export const Edit2 = withDefaults(Iconsax.Edit2);
export const Element3 = withDefaults(Iconsax.Element3);
export const Eye = withDefaults(Iconsax.Eye);
export const Filter = withDefaults(Iconsax.Filter);
export const Gallery = withDefaults(Iconsax.Gallery);
export const Hashtag = withDefaults(Iconsax.Hashtag);
export const Hierarchy = withDefaults(Iconsax.Hierarchy);
export const Home = withDefaults(Iconsax.Home);
export const InfoCircle = withDefaults(Iconsax.InfoCircle);
export const Location = withDefaults(Iconsax.Location);
export const Lock = withDefaults(Iconsax.Lock);
export const Logout = withDefaults(Iconsax.Logout);
export const Money = withDefaults(Iconsax.Money);
export const Monitor = withDefaults(Iconsax.Monitor);
export const MessageQuestion = withDefaults(Iconsax.MessageQuestion);
export const MoreCircle = withDefaults(Iconsax.MoreCircle);
export const Notification = withDefaults(Iconsax.Notification);
export const Personalcard = withDefaults(Iconsax.Personalcard);
export const PenTool = withDefaults(Iconsax.PenTool);
export const Printer = withDefaults(Iconsax.Printer);
export const Profile = withDefaults(Iconsax.Profile);
export const Profile2User = withDefaults(Iconsax.Profile2User);
export const Receipt = withDefaults(Iconsax.Receipt);
export const Refresh2 = withDefaults(Iconsax.Refresh2);
export const RotateLeft = withDefaults(Iconsax.RotateLeft);
export const ScanBarcode = withDefaults(Iconsax.ScanBarcode);
export const SearchNormal1 = withDefaults(Iconsax.SearchNormal1);
export const Send2 = withDefaults(Iconsax.Send2);
export const Setting2 = withDefaults(Iconsax.Setting2);
export const ShieldTick = withDefaults(Iconsax.ShieldTick);
export const Shop = withDefaults(Iconsax.Shop);
export const ShoppingCart = withDefaults(Iconsax.ShoppingCart);
export const Sms = withDefaults(Iconsax.Sms);
export const Star = withDefaults(Iconsax.Star);
export const TickCircle = withDefaults(Iconsax.TickCircle);
export const Timer1 = withDefaults(Iconsax.Timer1);
export const TimerStart = withDefaults(Iconsax.TimerStart);
export const Trash = withDefaults(Iconsax.Trash);
export const Truck = withDefaults(Iconsax.Truck);
export const UserAdd = withDefaults(Iconsax.UserAdd);
export const Verify = withDefaults(Iconsax.Verify);
export const Video = withDefaults(Iconsax.Video);
export const Wallet = withDefaults(Iconsax.Wallet);
export const Warning2 = withDefaults(Iconsax.Warning2);
