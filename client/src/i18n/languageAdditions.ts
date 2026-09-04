import type { Language } from "./translations";

export type ExtendedLanguage = Language | "es" | "ar" | "pt";

export const languageAdditions: Record<"es" | "ar" | "pt", Record<string, string>> = {
  es: {
    "nav.home":"Inicio","nav.feed":"Para ti","nav.search":"Buscar","nav.trending":"Tendencias","nav.upload":"Subir","nav.profile":"Perfil","nav.monetization":"Monetización","nav.notifications":"Notificaciones","nav.logout":"Cerrar sesión",
    "feed.loading":"Cargando videos...","feed.no_videos":"No se encontraron videos","feed.like":"Me gusta","feed.unlike":"Ya no me gusta","feed.comment":"Comentar","feed.share":"Compartir","feed.follow":"Seguir","feed.unfollow":"Dejar de seguir",
    "upload.title":"Subir un video","upload.drag_drop":"Arrastra y suelta tu video aquí","upload.select_file":"Seleccionar archivo","upload.video_title":"Título del video","upload.description":"Descripción","upload.add_sound":"Añadir sonido","upload.make_public":"Hacer público","upload.publish":"Publicar","upload.uploading":"Subiendo...","upload.success":"¡Video subido correctamente!",
    "profile.followers":"Seguidores","profile.following":"Siguiendo","profile.videos":"Videos","profile.edit":"Editar perfil","profile.my_videos":"Mis videos","profile.earnings":"Ingresos",
    "monetization.title":"Monetización","monetization.total_earnings":"Ingresos totales","monetization.total_withdrawals":"Retiros totales","monetization.available_balance":"Saldo disponible","monetization.request_withdrawal":"Solicitar retiro","monetization.amount":"Cantidad","monetization.payment_method":"Método de pago","monetization.mtn_money":"MTN Mobile Money","monetization.orange_money":"Orange Money","monetization.wave":"Wave","monetization.airtel_money":"Airtel Money","monetization.bank_transfer":"Transferencia bancaria",
    "search.title":"Buscar","search.placeholder":"Buscar videos o creadores...","search.videos":"Videos","search.creators":"Creadores","search.hashtags":"Hashtags",
    "trending.title":"Tendencias","trending.videos":"Videos en tendencia","trending.hashtags":"Hashtags en tendencia","trending.creators":"Creadores populares",
    "common.loading":"Cargando...","common.error":"Ocurrió un error","common.success":"¡Éxito!","common.cancel":"Cancelar","common.save":"Guardar","common.delete":"Eliminar","common.edit":"Editar","common.close":"Cerrar"
  },
  ar: {
    "nav.home":"الرئيسية","nav.feed":"الموجز","nav.search":"بحث","nav.trending":"الرائج","nav.upload":"رفع","nav.profile":"الملف الشخصي","nav.monetization":"تحقيق الدخل","nav.notifications":"الإشعارات","nav.logout":"تسجيل الخروج",
    "feed.loading":"جارٍ تحميل الفيديوهات...","feed.no_videos":"لم يتم العثور على فيديوهات","feed.like":"إعجاب","feed.unlike":"إلغاء الإعجاب","feed.comment":"تعليق","feed.share":"مشاركة","feed.follow":"متابعة","feed.unfollow":"إلغاء المتابعة",
    "upload.title":"رفع فيديو","upload.drag_drop":"اسحب الفيديو وأفلته هنا","upload.select_file":"اختيار ملف","upload.video_title":"عنوان الفيديو","upload.description":"الوصف","upload.add_sound":"إضافة صوت","upload.make_public":"جعله عامًا","upload.publish":"نشر","upload.uploading":"جارٍ الرفع...","upload.success":"تم رفع الفيديو بنجاح!",
    "profile.followers":"المتابعون","profile.following":"المتابَعون","profile.videos":"الفيديوهات","profile.edit":"تعديل الملف الشخصي","profile.my_videos":"فيديوهاتي","profile.earnings":"الأرباح",
    "monetization.title":"تحقيق الدخل","monetization.total_earnings":"إجمالي الأرباح","monetization.total_withdrawals":"إجمالي عمليات السحب","monetization.available_balance":"الرصيد المتاح","monetization.request_withdrawal":"طلب سحب","monetization.amount":"المبلغ","monetization.payment_method":"طريقة الدفع","monetization.mtn_money":"MTN Mobile Money","monetization.orange_money":"Orange Money","monetization.wave":"Wave","monetization.airtel_money":"Airtel Money","monetization.bank_transfer":"تحويل بنكي",
    "search.title":"بحث","search.placeholder":"ابحث عن فيديوهات أو منشئي محتوى...","search.videos":"فيديوهات","search.creators":"منشئو المحتوى","search.hashtags":"الوسوم",
    "trending.title":"الرائج","trending.videos":"الفيديوهات الرائجة","trending.hashtags":"الوسوم الرائجة","trending.creators":"منشئو المحتوى المشهورون",
    "common.loading":"جارٍ التحميل...","common.error":"حدث خطأ","common.success":"نجاح!","common.cancel":"إلغاء","common.save":"حفظ","common.delete":"حذف","common.edit":"تعديل","common.close":"إغلاق"
  },
  pt: {
    "nav.home":"Início","nav.feed":"Feed","nav.search":"Pesquisar","nav.trending":"Tendências","nav.upload":"Enviar","nav.profile":"Perfil","nav.monetization":"Monetização","nav.notifications":"Notificações","nav.logout":"Sair",
    "feed.loading":"Carregando vídeos...","feed.no_videos":"Nenhum vídeo encontrado","feed.like":"Curtir","feed.unlike":"Descurtir","feed.comment":"Comentar","feed.share":"Compartilhar","feed.follow":"Seguir","feed.unfollow":"Deixar de seguir",
    "upload.title":"Enviar um vídeo","upload.drag_drop":"Arraste e solte seu vídeo aqui","upload.select_file":"Selecionar arquivo","upload.video_title":"Título do vídeo","upload.description":"Descrição","upload.add_sound":"Adicionar som","upload.make_public":"Tornar público","upload.publish":"Publicar","upload.uploading":"Enviando...","upload.success":"Vídeo enviado com sucesso!",
    "profile.followers":"Seguidores","profile.following":"Seguindo","profile.videos":"Vídeos","profile.edit":"Editar perfil","profile.my_videos":"Meus vídeos","profile.earnings":"Ganhos",
    "monetization.title":"Monetização","monetization.total_earnings":"Ganhos totais","monetization.total_withdrawals":"Saques totais","monetization.available_balance":"Saldo disponível","monetization.request_withdrawal":"Solicitar saque","monetization.amount":"Valor","monetization.payment_method":"Método de pagamento","monetization.mtn_money":"MTN Mobile Money","monetization.orange_money":"Orange Money","monetization.wave":"Wave","monetization.airtel_money":"Airtel Money","monetization.bank_transfer":"Transferência bancária",
    "search.title":"Pesquisar","search.placeholder":"Pesquisar vídeos ou criadores...","search.videos":"Vídeos","search.creators":"Criadores","search.hashtags":"Hashtags",
    "trending.title":"Tendências","trending.videos":"Vídeos em alta","trending.hashtags":"Hashtags em alta","trending.creators":"Criadores populares",
    "common.loading":"Carregando...","common.error":"Ocorreu um erro","common.success":"Sucesso!","common.cancel":"Cancelar","common.save":"Salvar","common.delete":"Excluir","common.edit":"Editar","common.close":"Fechar"
  }
};
