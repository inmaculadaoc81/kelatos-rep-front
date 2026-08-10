/**
 * Texto legal de las condiciones del servicio — copiado literalmente de
 * FormularioCliente.html (condicionesOrdenador / condicionesCintas /
 * condicionesElectrodomestico). No parafrasear: es contenido contractual.
 */

export type CategoriaCondiciones = "ordenador" | "cintas" | "electrodomestico";

export const TIPOS_ORDENADOR = ["Portátil", "Ordenador de sobremesa", "Consola"];
export const TIPOS_ELECTRODOMESTICO = ["Aspirador", "Robot aspirador", "Robot de cocina", "Batidora", "Ventilador", "Purificador"];

export function categoriaDeCondiciones(tipoProducto: string): CategoriaCondiciones {
  if (tipoProducto === "Conversión de cintas") return "cintas";
  if (TIPOS_ORDENADOR.includes(tipoProducto)) return "ordenador";
  return "electrodomestico";
}

export const CONDICIONES_ORDENADOR: string[] = [
  "Diagnóstico gratuito. La revisión y diagnóstico de ordenadores y discos duros es totalmente gratuita.",
  "Plazo de elaboración del presupuesto. El presupuesto se elaborará en un plazo aproximado de 24 horas desde la recepción del equipo.",
  "Validez del presupuesto. Los presupuestos emitidos tendrán una validez de 8 días naturales.",
  "Garantía de las reparaciones. Todas las reparaciones realizadas cuentan con una garantía de 6 meses. La garantía cubre exclusivamente la reparación efectuada y no incluye averías o fallos en otros componentes del equipo no relacionados con dicha reparación.",
  "Garantía de cargadores originales. Los cargadores originales tienen una garantía de 1 año.",
  "Daños o fallos ocultos. La empresa no se responsabiliza de daños, defectos o fallos ocultos que el equipo pudiera presentar y que no hayan podido detectarse durante el diagnóstico. Dichos fallos pueden manifestarse antes, durante o después de la reparación.",
  "Exclusiones de garantía. La garantía no cubre daños ocasionados por un uso indebido, falta de mantenimiento, incumplimiento de las recomendaciones del fabricante, falta de sustitución de filtros, derramamiento o filtración de líquidos, golpes, caídas o cualquier otra causa ajena a la reparación realizada.",
  "Piezas bajo pedido. Las piezas solicitadas expresamente para una reparación no serán reembolsables en caso de que el cliente decida no aceptar finalmente el presupuesto.",
  "Plazos de suministro de piezas. Los plazos indicados para la recepción de piezas son orientativos y pueden verse afectados por retrasos ajenos a nuestra empresa. En caso de producirse cualquier demora, el cliente será informado oportunamente. La empresa no se hace responsable de retrasos ocasionados por terceros.",
  "Copias de seguridad. Es responsabilidad exclusiva del cliente realizar una copia de seguridad de sus datos antes de entregar el equipo. La empresa no se responsabiliza de la pérdida de información, programas, configuraciones o datos almacenados en el dispositivo.",
  "Reparación con resultado satisfactorio. Las reparaciones se facturarán únicamente cuando hayan sido realizadas con éxito. En caso de no poder efectuarse la reparación, el cliente no deberá abonar importe alguno por la misma, salvo aquellos conceptos previamente aceptados que pudieran corresponder.",
  "Aceptación o rechazo del presupuesto. El cliente deberá comunicar de forma expresa y por escrito la aceptación o rechazo del presupuesto, respondiendo al mensaje mediante el cual le haya sido enviado. Los presupuestos aceptados no es posible rechazarlos.",
  "Recogida del equipo. El cliente deberá comunicar previamente su decisión sobre el presupuesto antes de acudir al establecimiento. Si el equipo no estuviera preparado para su entrega y el cliente acudiera al local sin previo aviso, no podrá retirarlo y deberá regresar en otra fecha.",
  "Reparaciones de placa base. Las reparaciones de placa base pueden requerir hasta 10 días laborables. Este plazo podrá ampliarse si fuera necesario solicitar microcomponentes o piezas específicas.",
  "Cobro por almacenaje por falta de respuesta. Si transcurren 30 días desde la comunicación del presupuesto sin que el cliente haya informado de su aceptación o rechazo, se aplicará un cargo por almacenamiento de 1 € + IVA por día.",
  "Cobro por almacenaje tras la reparación. Una vez comunicado al cliente que el equipo está reparado o listo para su recogida, dispondrá de 30 días para retirarlo. Transcurrido dicho plazo, se aplicará un cargo por almacenamiento de 1 € + IVA por día. El cómputo comenzará desde la fecha de notificación de disponibilidad del equipo.",
  "Abandono del equipo. Si el equipo no es recogido en un plazo de 6 meses desde su depósito o desde la notificación de disponibilidad para su retirada, se considerará abandonado. Mediante la aceptación de estas condiciones, el cliente autoriza expresamente a la empresa a gestionar su eliminación o traslado a un punto limpio autorizado, sin derecho a reclamación posterior.",
  "Protección de datos personales. Los datos facilitados por el cliente serán tratados por Affirma Technology Group S.L. con la finalidad de gestionar el diagnóstico, presupuesto, reparación, recogida, entrega, facturación, garantía y comunicaciones relacionadas con el servicio contratado. La base jurídica del tratamiento es la ejecución del contrato. Los datos se conservarán durante los plazos legalmente exigidos. El cliente podrá ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad conforme a la normativa vigente. Puede consultar información adicional sobre protección de datos en nuestra Política de Privacidad.",
  "Comunicaciones relacionadas con el servicio. El cliente autoriza a Affirma Technology Group S.L. a contactar mediante llamada telefónica, correo electrónico, SMS, WhatsApp u otros medios electrónicos con el único fin de informar sobre presupuestos, reparaciones, garantías, recogidas, entregas y cualquier otra gestión relacionada con el servicio contratado.",
  "Confidencialidad de la información. Affirma Technology Group S.L. se compromete a tratar con la máxima confidencialidad la información contenida en los equipos entregados para diagnóstico, reparación o recuperación de datos. El acceso a la información almacenada en los dispositivos se limitará exclusivamente a lo necesario para la correcta prestación del servicio solicitado.",
];

export const CONDICIONES_CINTAS: string[] = [
  "Precios del servicio. Las cintas tienen un coste fijo desde el momento de su entrega. Para cintas VHS, Hi8, MiniDV, Cassette, BETA y VHS-C: de 1 a 4 cintas, 15 € + IVA por cinta; de 5 a 9 cintas, 12 € + IVA por cinta; 10 cintas o más, 10 € + IVA por cinta. Para cintas de bobina: 20 € + IVA por cinta, independientemente de la cantidad entregada.",
  "Cobro por contenido. Toda cinta convertida que tenga contenido será cobrada. El cliente es responsable de conocer el contenido de las cintas que entrega.",
  "Medio de almacenamiento. El cliente debe disponer de un medio de almacenamiento propio (USB, disco duro externo u otro soporte) donde guardar el resultado digital. En caso de no disponer de uno, podemos vender un pendrive por un coste adicional.",
  "Calidad del contenido. La calidad del resultado es la original de la grabación. No es posible mejorar el audio ni el vídeo de la cinta, ni se realiza ningún tipo de edición del contenido.",
  "Cintas con moho. Las cintas que presenten moho no pueden ser procesadas. La empresa se reserva el derecho a rechazar el servicio para este tipo de material.",
  "Responsabilidad por deterioro. La empresa no se hace responsable de desperfectos derivados del paso del tiempo. Si una cinta está cortada, en mal estado físico o presenta problemas en el contenido con carácter previo a la entrega, la empresa no asume ninguna responsabilidad al respecto.",
  "Conservación del contenido digital. El archivo digital resultante se conservará en los dispositivos de la empresa durante un plazo máximo de 1 semana desde su notificación de disponibilidad al cliente, transcurrido el cual será eliminado.",
  "Tiempo de conversión. El tiempo de conversión es orientativo. Las cintas se digitalizan en tiempo real, por lo que la duración del proceso depende directamente de la duración del contenido grabado. Las cintas de bobina requieren un tiempo de procesamiento adicional.",
  "Entrega en local. El contenido digitalizado no se sube a ninguna plataforma en la nube. El cliente deberá recoger el resultado en el establecimiento junto con las cintas originales.",
  "Abandono del material. Si las cintas y el resultado digital no son recogidos en un plazo de 6 meses desde la notificación de disponibilidad, el cliente autoriza expresamente a la empresa a proceder a su eliminación mediante envío a un punto limpio autorizado, sin derecho a reclamación posterior.",
  "Descuentos no acumulables. Los descuentos por volumen se aplican únicamente al lote de cintas entregado en cada visita. Las cintas aportadas en ocasiones futuras no se acumulan con las anteriores a efectos de precio.",
  "Protección de datos personales. Los datos facilitados por el cliente serán tratados por Affirma Technology Group S.L. con la finalidad de gestionar el servicio contratado. La base jurídica del tratamiento es la ejecución del contrato. Los datos se conservarán durante los plazos legalmente exigidos. El cliente podrá ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad conforme a la normativa vigente. Puede consultar información adicional sobre protección de datos en nuestra Política de Privacidad.",
  "Comunicaciones relacionadas con el servicio. El cliente autoriza a Affirma Technology Group S.L. a contactar mediante llamada telefónica, correo electrónico, SMS, WhatsApp u otros medios electrónicos con el único fin de informar sobre el estado del pedido y cualquier gestión relacionada con el servicio contratado.",
  "Confidencialidad de la información. Affirma Technology Group S.L. se compromete a tratar con la máxima confidencialidad el contenido de las cintas entregadas. El acceso al material se limitará exclusivamente a lo necesario para la correcta prestación del servicio.",
];

export const CONDICIONES_ELECTRODOMESTICO: string[] = [
  "Coste de revisión y diagnóstico. La revisión y diagnóstico de equipos Dyson y Thermomix es gratuita. Para el resto de electrodomésticos, el coste de revisión es de 20 € + IVA (24,20 € IVA incluido).",
  "Descuento del coste de revisión. El importe abonado por la revisión será descontado del precio final de la reparación en caso de aceptación del presupuesto.",
  "Plazo de elaboración del presupuesto. El presupuesto se elaborará en un plazo aproximado de 24 horas desde la recepción del equipo.",
  "Validez del presupuesto. Los presupuestos emitidos tendrán una validez de 8 días naturales.",
  "Falta de disponibilidad de repuestos. En caso de que no sea posible localizar o suministrar los repuestos necesarios para efectuar la reparación, el importe abonado por la revisión no será reembolsado.",
  "Garantía de las reparaciones. Todas las reparaciones realizadas cuentan con una garantía de 6 meses. La garantía cubre exclusivamente la reparación efectuada y no incluye averías o fallos en otros componentes distintos de los reparados.",
  "Exclusiones de garantía. La garantía no cubre daños ocasionados por un uso indebido, falta de mantenimiento, incumplimiento de las recomendaciones del fabricante, falta de sustitución de filtros, derramamiento o filtración de líquidos, golpes, caídas o cualquier otra causa ajena a la reparación realizada.",
  "Desperfectos derivados del desmontaje. Determinados electrodomésticos pueden presentar pequeñas marcas o desperfectos estéticos inevitables durante el proceso de desmontaje y reparación. Como ejemplo, algunos modelos de secadores Dyson pueden sufrir ligeros daños en la pintura o acabado de determinados componentes, especialmente en botones o zonas de ensamblaje.",
  "Piezas bajo pedido. Las piezas solicitadas específicamente para una reparación no son reembolsables una vez realizado el pedido al proveedor.",
  "Plazos de suministro de piezas. Los plazos indicados para la recepción de piezas son orientativos y pueden verse afectados por retrasos ajenos a nuestra empresa. En caso de producirse alguna demora, el cliente será informado. La empresa no se responsabiliza de retrasos ocasionados por terceros.",
  "Daños o fallos ocultos. La empresa no se responsabiliza de daños, defectos o fallos ocultos que el equipo pudiera presentar y que no hayan podido detectarse durante el diagnóstico. Estos fallos pueden manifestarse antes, durante o después de la reparación.",
  "Reparaciones con resultado satisfactorio. Las reparaciones se facturarán únicamente cuando hayan sido realizadas con éxito. En caso de que la reparación no pueda completarse satisfactoriamente, el cliente no deberá abonar el importe correspondiente a la reparación, salvo aquellos conceptos previamente aceptados que pudieran corresponder.",
  "Aceptación o rechazo del presupuesto. El cliente deberá comunicar de forma expresa y por escrito la aceptación o rechazo del presupuesto, respondiendo al mensaje mediante el cual le haya sido enviado.",
  "Reparaciones de placas electrónicas. Las reparaciones de placas electrónicas o placas base pueden requerir hasta 10 días laborables. Este plazo podrá ampliarse si fuera necesario solicitar microcomponentes o piezas específicas.",
  "Cobro por almacenaje. Una vez comunicado al cliente que el equipo está reparado, no es reparable o está listo para su recogida, dispondrá de 30 días para retirarlo. Transcurrido dicho plazo, se aplicará un cargo por almacenamiento de 1 € + IVA por día. El cómputo comenzará desde la fecha de notificación al cliente.",
  "Abandono del equipo. Si el equipo no es retirado en un plazo de 6 meses desde su entrega al servicio técnico o desde la notificación de disponibilidad para su recogida, se considerará abandonado. Mediante la aceptación de estas condiciones, el cliente autoriza expresamente a la empresa a gestionar su eliminación, reciclaje o traslado a un punto limpio autorizado, sin derecho a reclamación posterior.",
  "Protección de datos personales. Los datos facilitados por el cliente serán tratados por Affirma Technology Group S.L. con la finalidad de gestionar el diagnóstico, presupuesto, reparación, recogida, entrega, facturación, garantía y comunicaciones relacionadas con el servicio contratado. La base jurídica del tratamiento es la ejecución del contrato. Los datos se conservarán durante los plazos legalmente exigidos. El cliente podrá ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad conforme a la normativa vigente. Puede consultar información adicional sobre protección de datos en nuestra Política de Privacidad.",
  "Comunicaciones relacionadas con el servicio. El cliente autoriza a Affirma Technology Group S.L. a contactar mediante llamada telefónica, correo electrónico, SMS, WhatsApp u otros medios electrónicos con el único fin de informar sobre presupuestos, reparaciones, garantías, recogidas, entregas y cualquier otra gestión relacionada con el servicio contratado.",
  "Confidencialidad de la información. Affirma Technology Group S.L. se compromete a tratar con la máxima confidencialidad la información contenida en los equipos entregados para diagnóstico, reparación o recuperación de datos. El acceso a la información almacenada en los dispositivos se limitará exclusivamente a lo necesario para la correcta prestación del servicio solicitado.",
];

export const CONDICIONES_POR_CATEGORIA: Record<CategoriaCondiciones, string[]> = {
  ordenador: CONDICIONES_ORDENADOR,
  cintas: CONDICIONES_CINTAS,
  electrodomestico: CONDICIONES_ELECTRODOMESTICO,
};
