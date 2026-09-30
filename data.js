/* ============================================================
 * data.js — встроенный словарь ETT (English Today and Tomorrow)
 * 12 системных папок × 12 слов = 144 единицы лексики.
 * Каждое слово снабжено примером употребления и прямой ссылкой
 * на изображение с Unsplash (Source API) в формате:
 *   https://images.unsplash.com/photo-...?auto=format&fit=crop&w=600&q=60
 * Эти данные при первом запуске копируются в LocalStorage
 * (ключи "ett_folders" и "ett_words"), после чего все изменения
 * пользователя сохраняются только локально.
 * ============================================================ */

// 12 системных (isSystem=true) папок с эмодзи-иконками и мнемоническими стишками
// rhyme — короткий стишок-запоминалка для всей группы слов
const SYSTEM_FOLDERS = [
  { id: 'f1',  name: 'Еда',          icon: '🍎', isSystem: true,
    rhyme: 'Apple — яблоко, banana — банан,\nBread — хлеб, cheese — сыр, это наш план.\nEgg — яйцо, fish — рыба, meat — мясо,\nMilk — молоко, rice — рис, всё прекрасно!' },
  { id: 'f2',  name: 'Животные',     icon: '🐾', isSystem: true,
    rhyme: 'Cat — кошка, dog — собака,\nBear — медведь, bird — птица, however,\nCow — корова, horse — лошадь, в поле,\nLion — лев — царь, при своём произволе!' },
  { id: 'f3',  name: 'Семья',        icon: '👨‍👩‍👧', isSystem: true,
    rhyme: 'Mother — мама, father — папа,\nSister — сестра, brother — брат, вот так-то.\nGrandma — бабушка, grandpa — дед,\nUncle — дядя, aunt — тётя, вот и ответ!' },
  { id: 'f4',  name: 'Школа',        icon: '🏫', isSystem: true,
    rhyme: 'Pen — ручка, pencil — карандаш,\nBook — книга, bag — рюкзак, вот это класс.\nBoard — доска, desk — парта, lesson — урок,\nMark — оценка, teacher — учитель, будь как урок!' },
  { id: 'f5',  name: 'Погода',       icon: '🌦️', isSystem: true,
    rhyme: 'Sun — солнце, rain — дождь,\nSnow — снег, ice — лёд, ну что ты ждёшь?\nWind — ветер, cloud — облако, fog — туман,\nStorm — гроза, cold — холод, не обман!' },
  { id: 'f6',  name: 'Спорт',        icon: '⚽', isSystem: true,
    rhyme: 'Ball — мяч, goal — гол, team — команда,\nRun — бежать, jump — прыжок, ну как же странно.\nWin — победить, lose — проиграть,\nScore — счёт, swim — плавать, что сказать!' },
  { id: 'f7',  name: 'Путешествия',  icon: '✈️', isSystem: true,
    rhyme: 'Plane — самолёт, train — поезд, ticket — билет,\nMap — карта, hotel — отель, вот мой ответ.\nGuide — гид, tourist — турист, journey — путь,\nSuitcase — чемодан, airport — аэропорт, не позабыть!' },
  { id: 'f8',  name: 'Эмоции',       icon: '😊', isSystem: true,
    rhyme: 'Happy — счастливый, sad — грустный,\nAngry — сердитый, calm — спокойный, вестимо.\nTired — уставший, bored — скучный,\nProud — гордый, lonely — одинокий, лучший!' },
  { id: 'f9',  name: 'Дом',          icon: '🏠', isSystem: true,
    rhyme: 'Door — дверь, window — окно,\nWall — стена, floor — пол, вот кино.\nRoom — комната, kitchen — кухня, bedroom — спальня,\nTable — стол, chair — стул, lamp — лампа, без изъяна!' },
  { id: 'f10', name: 'Одежда',       icon: '👕', isSystem: true,
    rhyme: 'Shirt — рубашка, dress — платье,\nHat — шляпа, coat — пальто, как на параде.\nShoe — ботинок, sock — носок, pants — брюки,\nJacket — куртка, skirt — юбка — всё в нюансы!' },
  { id: 'f11', name: 'Природа',      icon: '🌳', isSystem: true,
    rhyme: 'Tree — дерево, flower — цветок,\nGrass — трава, leaf — лист, на лужок.\nRiver — река, lake — озеро, sea — море,\nMountain — гора, forest — лес — простор, не горе!' },
  { id: 'f12', name: 'Технологии',   icon: '💻', isSystem: true,
    rhyme: 'Computer — компьютер, phone — телефон,\nInternet — интернет, file — файл, всё he on.\nScreen — экран, keyboard — клавиатура,\nMouse — мышь, password — пароль, как литература!' }
];

// 144 слова. Сортировка по английскому слову.
const SYSTEM_WORDS = [
  // ---- f1: Еда ----
  { id:'w101', word:'apple',     translation:'яблоко',     example:'I eat a green apple every morning.',           folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=600&q=60' },
  { id:'w102', word:'banana',    translation:'банан',      example:'She bought a yellow banana for the baby.',     folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=60' },
  { id:'w103', word:'bread',     translation:'хлеб',       example:'Fresh bread smells wonderful.',                folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=60' },
  { id:'w104', word:'cheese',    translation:'сыр',       example:'Italian cheese is famous all over the world.',folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=60' },
  { id:'w105', word:'egg',       translation:'яйцо',      example:'He boiled an egg for breakfast.',             folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=60' },
  { id:'w106', word:'fish',      translation:'рыба',      example:'Grilled fish is healthy and tasty.',           folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1535399831218-d4db9f6f5dba?auto=format&fit=crop&w=600&q=60' },
  { id:'w107', word:'meat',      translation:'мясо',      example:'My grandfather prefers roasted meat.',         folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1603048719574-7f0602a0c4b6?auto=format&fit=crop&w=600&q=60' },
  { id:'w108', word:'milk',      translation:'молоко',    example:'Cold milk goes well with chocolate cookies.',   folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=60' },
  { id:'w109', word:'rice',     translation:'рис',       example:'Rice is a basic food in many countries.',       folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=60' },
  { id:'w110', word:'salt',     translation:'соль',      example:'Add a pinch of salt to the soup.',              folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1518110925495-b37653d22271?auto=format&fit=crop&w=600&q=60' },
  { id:'w111', word:'soup',     translation:'суп',       example:'Tomato soup is my favourite in winter.',        folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=60' },
  { id:'w112', word:'water',    translation:'вода',      example:'Drink water before you feel thirsty.',          folderId:'f1',  imageUrl:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=60' },

  // ---- f2: Животные ----
  { id:'w201', word:'bear',     translation:'медведь',   example:'A brown bear caught a salmon in the river.',    folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1589656966835-1356d5f5c3f9?auto=format&fit=crop&w=600&q=60' },
  { id:'w202', word:'bird',     translation:'птица',     example:'A small bird sang on the windowsill.',          folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=600&q=60' },
  { id:'w203', word:'cat',      translation:'кошка',     example:'The cat is sleeping on the warm sofa.',          folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=600&q=60' },
  { id:'w204', word:'cow',      translation:'корова',     example:'The cow gives us fresh milk every day.',        folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1500595046743-c62e5c0e4f6b?auto=format&fit=crop&w=600&q=60' },
  { id:'w205', word:'dog',      translation:'собака',    example:'My dog wags its tail when I come home.',         folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=60' },
  { id:'w206', word:'fish',     translation:'рыба',      example:'A tiny fish swam near the stones.',             folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=600&q=60' },
  { id:'w207', word:'horse',    translation:'лошадь',    example:'The horse ran quickly across the field.',        folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=60' },
  { id:'w208', word:'lion',     translation:'лев',       example:'The lion is the king of the savannah.',          folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&q=60' },
  { id:'w209', word:'mouse',    translation:'мышь',      example:'A grey mouse hid behind the cupboard.',          folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1425082806426-8606a46fc959?auto=format&fit=crop&w=600&q=60' },
  { id:'w210', word:'pig',      translation:'свинья',     example:'A pink pig rolled in the mud happily.',         folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1555431189-8f8d69d2a4f3?auto=format&fit=crop&w=600&q=60' },
  { id:'w211', word:'rabbit',   translation:'кролик',    example:'A white rabbit jumped into the garden.',         folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=600&q=60' },
  { id:'w212', word:'wolf',     translation:'волк',      example:'The wolf howled at the full moon.',              folderId:'f2',  imageUrl:'https://images.unsplash.com/photo-1564284247427-9c0a70c2f4d1?auto=format&fit=crop&w=600&q=60' },

  // ---- f3: Семья ----
  { id:'w301', word:'aunt',      translation:'тётя',      example:'My aunt bakes the best apple pie.',             folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1607746882042-944635dfe0e9?auto=format&fit=crop&w=600&q=60' },
  { id:'w302', word:'brother',   translation:'брат',      example:'My brother is two years older than me.',         folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1571212515416-fef01f1a8c12?auto=format&fit=crop&w=600&q=60' },
  { id:'w303', word:'cousin',    translation:'кузен',     example:'My cousin lives in another city.',               folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=600&q=60' },
  { id:'w304', word:'daughter',  translation:'дочь',      example:'Their daughter is only five years old.',         folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1518717207596-dda6241a0cd4?auto=format&fit=crop&w=600&q=60' },
  { id:'w305', word:'father',    translation:'отец',      example:'My father drives me to school every morning.',   folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=60' },
  { id:'w306', word:'grandfather',translation:'дедушка',  example:'My grandfather tells stories about his youth.',  folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1568924786129-c2c4c8f6d569?auto=format&fit=crop&w=600&q=60' },
  { id:'w307', word:'grandmother',translation:'бабушка',  example:'Grandmother knits warm socks for winter.',        folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1581579438747-104c53e7cb71?auto=format&fit=crop&w=600&q=60' },
  { id:'w308', word:'mother',    translation:'мать',      example:'My mother cooks delicious borscht.',              folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=60' },
  { id:'w309', word:'parents',   translation:'родители',  example:'My parents help me with my homework.',           folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=600&q=60' },
  { id:'w310', word:'sister',    translation:'сестра',    example:'My little sister loves drawing cats.',           folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1517845738-6d9d18f5c95b?auto=format&fit=crop&w=600&q=60' },
  { id:'w311', word:'son',       translation:'сын',       example:'Their son won a school chess tournament.',        folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=600&q=60' },
  { id:'w312', word:'uncle',     translation:'дядя',      example:'My uncle works as a builder in Moscow.',          folderId:'f3',  imageUrl:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=60' },

  // ---- f4: Школа ----
  { id:'w401', word:'bag',       translation:'рюкзак',    example:'My school bag is heavy on Mondays.',             folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=60' },
  { id:'w402', word:'board',     translation:'доска',     example:'The teacher wrote the task on the board.',       folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=600&q=60' },
  { id:'w403', word:'book',      translation:'книга',     example:'This book is about ancient Rome.',                folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=60' },
  { id:'w404', word:'class',     translation:'класс',     example:'Our class is friendly and helpful.',             folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=60' },
  { id:'w405', word:'desk',      translation:'парта',     example:'My desk is near the window.',                     folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=60' },
  { id:'w406', word:'eraser',    translation:'ластик',    example:'I need an eraser to fix my mistake.',             folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1456081445454-9e5b0e7f3f7e?auto=format&fit=crop&w=600&q=60' },
  { id:'w407', word:'lesson',    translation:'урок',      example:'The English lesson starts at nine.',             folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=60' },
  { id:'w408', word:'mark',      translation:'оценка',    example:'I got the highest mark in maths.',               folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1606326608606-aa0b429b4450?auto=format&fit=crop&w=600&q=60' },
  { id:'w409', word:'pen',       translation:'ручка',     example:'My pen ran out of ink again.',                   folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1583485088034-697c5d1b65e1?auto=format&fit=crop&w=600&q=60' },
  { id:'w410', word:'pencil',    translation:'карандаш',  example:'A sharp pencil is best for drawing.',           folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1568871391783-83f2a4f4d6a3?auto=format&fit=crop&w=600&q=60' },
  { id:'w411', word:'ruler',     translation:'линейка',   example:'Use a ruler to draw a straight line.',           folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1532619675605-1ede6c2fed98?auto=format&fit=crop&w=600&q=60' },
  { id:'w412', word:'teacher',   translation:'учитель',  example:'Our teacher explains grammar clearly.',          folderId:'f4',  imageUrl:'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=60' },

  // ---- f5: Погода ----
  { id:'w501', word:'cloud',     translation:'облако',    example:'A white cloud floated across the sky.',          folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1534088568595-a066f4102da4?auto=format&fit=crop&w=600&q=60' },
  { id:'w502', word:'cold',      translation:'холод',     example:'The cold winter wind froze my fingers.',         folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1551582045-6ec9c11d86d7?auto=format&fit=crop&w=600&q=60' },
  { id:'w503', word:'fog',       translation:'туман',     example:'Thick fog covered the city in the morning.',      folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=600&q=60' },
  { id:'w504', word:'heat',      translation:'жара',      example:'The summer heat was unbearable in July.',         folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1504370805625-d32af1c08f0f?auto=format&fit=crop&w=600&q=60' },
  { id:'w505', word:'hot',       translation:'жаркий',    example:'Today is too hot for a long walk.',               folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=60' },
  { id:'w506', word:'ice',       translation:'лёд',       example:'Black ice made the road dangerous.',              folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1517817430-007d4d9ce14f?auto=format&fit=crop&w=600&q=60' },
  { id:'w507', word:'rain',      translation:'дождь',     example:'The rain started suddenly in the afternoon.',     folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=600&q=60' },
  { id:'w508', word:'snow',      translation:'снег',      example:'The first snow fell in early November.',         folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1486944670666-66d1fdd81392?auto=format&fit=crop&w=600&q=60' },
  { id:'w509', word:'storm',     translation:'гроза',     example:'A summer storm cut the electricity.',            folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1428592953211-0774fd0e2a58?auto=format&fit=crop&w=600&q=60' },
  { id:'w510', word:'sun',       translation:'солнце',    example:'The warm sun came out after the rain.',           folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=60' },
  { id:'w511', word:'warm',      translation:'тёплый',    example:'A warm sweater is great for autumn.',            folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1542228262-3d663b306a53?auto=format&fit=crop&w=600&q=60' },
  { id:'w512', word:'wind',      translation:'ветер',     example:'A strong wind bent the young trees.',             folderId:'f5',  imageUrl:'https://images.unsplash.com/photo-1527482797697-8795b05a13b4?auto=format&fit=crop&w=600&q=60' },

  // ---- f6: Спорт ----
  { id:'w601', word:'ball',      translation:'мяч',       example:'He kicked the ball into the goal.',              folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=600&q=60' },
  { id:'w602', word:'game',      translation:'игра',      example:'Yesterday we watched a fantastic game.',          folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1543326727-cf6c3903f9b0?auto=format&fit=crop&w=600&q=60' },
  { id:'w603', word:'goal',      translation:'гол',       example:'Our team scored a goal in the last minute.',     folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=600&q=60' },
  { id:'w604', word:'jump',      translation:'прыжок',    example:'Her jump was the highest in the contest.',       folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=600&q=60' },
  { id:'w605', word:'kick',      translation:'удар',      example:'A powerful kick broke the goalkeeper.',          folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1579954115545-a44d99c7b7e6?auto=format&fit=crop&w=600&q=60' },
  { id:'w606', word:'lose',      translation:'проиграть', example:'Dont be sad if you lose once.',                 folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=600&q=60' },
  { id:'w607', word:'match',     translation:'матч',      example:'The final match ended in a draw.',               folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1522778119026-d6cfa2c5f1f6?auto=format&fit=crop&w=600&q=60' },
  { id:'w608', word:'run',       translation:'бегать',    example:'I run in the park every morning.',               folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=600&q=60' },
  { id:'w609', word:'score',     translation:'счёт',      example:'The score was three to one.',                     folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1518605370434-0100f3d9a7f3?auto=format&fit=crop&w=600&q=60' },
  { id:'w610', word:'swim',      translation:'плавать',   example:'Children love to swim in the sea.',               folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&w=600&q=60' },
  { id:'w611', word:'team',      translation:'команда',   example:'Our team trained hard all winter.',              folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=60' },
  { id:'w612', word:'win',       translation:'победить',  example:'We hope our class will win the relay.',          folderId:'f6',  imageUrl:'https://images.unsplash.com/photo-1567531468023-4da6c6d4c6f6?auto=format&fit=crop&w=600&q=60' },

  // ---- f7: Путешествия ----
  { id:'w701', word:'airport',   translation:'аэропорт',  example:'We arrived at the airport two hours early.',    folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1436491865332-7a61a109cc7c?auto=format&fit=crop&w=600&q=60' },
  { id:'w702', word:'guide',     translation:'гид',       example:'Our guide spoke three languages.',                folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=600&q=60' },
  { id:'w703', word:'hotel',     translation:'отель',     example:'The hotel had a rooftop pool.',                   folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=60' },
  { id:'w704', word:'journey',   translation:'путешествие',example:'The journey took us twelve hours.',              folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=60' },
  { id:'w705', word:'map',       translation:'карта',    example:'Open the map and find the red dot.',             folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=60' },
  { id:'w706', word:'passport',  translation:'паспорт',   example:'Dont forget your passport at home.',             folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=600&q=60' },
  { id:'w707', word:'plane',     translation:'самолёт',   example:'Our plane took off exactly on time.',             folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=600&q=60' },
  { id:'w708', word:'suitcase',  translation:'чемодан',   example:'My suitcase was too heavy to lift.',              folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1581558438927-9b39bb95eb4d?auto=format&fit=crop&w=600&q=60' },
  { id:'w709', word:'ticket',    translation:'билет',     example:'Show your ticket at the entrance.',              folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1502810190503-8303352d0dd1?auto=format&fit=crop&w=600&q=60' },
  { id:'w710', word:'tourist',   translation:'турист',    example:'A group of tourists stopped near the museum.',   folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=60' },
  { id:'w711', word:'train',     translation:'поезд',     example:'The fast train arrives at noon.',                 folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=600&q=60' },
  { id:'w712', word:'trip',      translation:'поездка',   example:'Our school trip was unforgettable.',              folderId:'f7',  imageUrl:'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=60' },

  // ---- f8: Эмоции ----
  { id:'w801', word:'afraid',    translation:'испуганный',example:'The child was afraid of the dark.',              folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1605000797494-95a51c5269ae?auto=format&fit=crop&w=600&q=60' },
  { id:'w802', word:'angry',     translation:'сердитый',  example:'He was angry because the bus was late.',         folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1606115915090-becc0c9f1f83?auto=format&fit=crop&w=600&q=60' },
  { id:'w803', word:'bored',     translation:'скучающий', example:'The students were bored by the long lecture.',    folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1593105544559-ec2c8c55f6a0?auto=format&fit=crop&w=600&q=60' },
  { id:'w804', word:'calm',      translation:'спокойный', example:'She stayed calm in a difficult situation.',       folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=60' },
  { id:'w805', word:'excited',   translation:'взволнованный',example:'The kids were excited about the holiday.',    folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1492684223066-81328ee5cc64?auto=format&fit=crop&w=600&q=60' },
  { id:'w806', word:'happy',     translation:'счастливый',example:'I am happy when my family is together.',         folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=600&q=60' },
  { id:'w807', word:'jealous',   translation:'ревнивый',  example:'He felt jealous of his friends success.',        folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=600&q=60' },
  { id:'w808', word:'lonely',    translation:'одинокий',  example:'The old man felt lonely without his dog.',        folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1517845738-6d9d18f5c95b?auto=format&fit=crop&w=600&q=60' },
  { id:'w809', word:'proud',     translation:'гордый',    example:'I am proud of my progress in English.',          folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?auto=format&fit=crop&w=600&q=60' },
  { id:'w810', word:'sad',       translation:'грустный',  example:'She felt sad when her friend moved away.',       folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=60' },
  { id:'w811', word:'surprised', translation:'удивлённый',example:'I was surprised by the news.',                    folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=600&q=60' },
  { id:'w812', word:'tired',     translation:'уставший',  example:'After the hike I felt very tired.',               folderId:'f8',  imageUrl:'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?auto=format&fit=crop&w=600&q=60' },

  // ---- f9: Дом ----
  { id:'w901', word:'bathroom',  translation:'ванная',    example:'The bathroom has a big mirror.',                  folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1584622650111-993a4f7d1e3c?auto=format&fit=crop&w=600&q=60' },
  { id:'w902', word:'bedroom',   translation:'спальня',    example:'My bedroom walls are light blue.',                folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=60' },
  { id:'w903', word:'chair',     translation:'стул',      example:'A wooden chair stood by the table.',             folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=60' },
  { id:'w904', word:'door',      translation:'дверь',     example:'Please close the door quietly.',                 folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1543128920-6b7d9c91e8ae?auto=format&fit=crop&w=600&q=60' },
  { id:'w905', word:'floor',     translation:'пол',      example:'The wooden floor creaked underfoot.',            folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=600&q=60' },
  { id:'w906', word:'kitchen',   translation:'кухня',     example:'Our kitchen is small but cosy.',                  folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=60' },
  { id:'w907', word:'lamp',      translation:'лампа',     example:'The reading lamp gave a soft warm light.',       folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=60' },
  { id:'w908', word:'roof',      translation:'крыша',     example:'The roof was covered with fresh snow.',           folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1572122332356-93e4d4f6f7a6?auto=format&fit=crop&w=600&q=60' },
  { id:'w909', word:'room',      translation:'комната',   example:'My room has a big window facing south.',          folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1493809842364-78817add7d74?auto=format&fit=crop&w=600&q=60' },
  { id:'w910', word:'table',     translation:'стол',      example:'We put fresh flowers on the table.',             folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=60' },
  { id:'w911', word:'wall',      translation:'стена',     example:'The wall was painted in light green.',            folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1493809842364-78817add7d74?auto=format&fit=crop&w=600&q=60' },
  { id:'w912', word:'window',    translation:'окно',      example:'Open the window to let some fresh air in.',      folderId:'f9',  imageUrl:'https://images.unsplash.com/photo-1518895949257-7621c3c2f7e4?auto=format&fit=crop&w=600&q=60' },

  // ---- f10: Одежда ----
  { id:'wa01', word:'coat',      translation:'пальто',    example:'A warm coat is a must in winter.',                folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=60' },
  { id:'wa02', word:'dress',     translation:'платье',   example:'Her new dress is bright yellow.',                 folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=60' },
  { id:'wa03', word:'glove',     translation:'перчатка',  example:'I lost one glove on the bus.',                    folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=60' },
  { id:'wa04', word:'hat',       translation:'шляпа',    example:'In summer I always wear a hat.',                  folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1521369909029-2afed882ba98?auto=format&fit=crop&w=600&q=60' },
  { id:'wa05', word:'jacket',    translation:'куртка',    example:'His leather jacket looked stylish.',              folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=60' },
  { id:'wa06', word:'pants',     translation:'брюки',    example:'These pants match my new shirt.',                 folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=60' },
  { id:'wa07', word:'scarf',     translation:'шарф',     example:'Grandma knitted me a long red scarf.',           folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1520903920243-00d8722a9c46?auto=format&fit=crop&w=600&q=60' },
  { id:'wa08', word:'shirt',     translation:'рубашка',   example:'My school shirt is white and stiff.',             folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=60' },
  { id:'wa09', word:'shoe',      translation:'ботинок',  example:'One shoe was hidden under the bed.',              folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=60' },
  { id:'wa10', word:'skirt',     translation:'юбка',     example:'Her denim skirt had embroidery on the pocket.',   folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1583496661160-fb5886a13d76?auto=format&fit=crop&w=600&q=60' },
  { id:'wa11', word:'sock',      translation:'носок',     example:'I need to buy a new pair of socks.',              folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1582538614876-cab1d6b0f4d4?auto=format&fit=crop&w=600&q=60' },
  { id:'wa12', word:'sweater',   translation:'свитер',   example:'This wool sweater keeps me very warm.',           folderId:'f10', imageUrl:'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=60' },

  // ---- f11: Природа ----
  { id:'wb01', word:'flower',    translation:'цветок',   example:'A yellow flower grew between the stones.',        folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&q=60' },
  { id:'wb02', word:'forest',    translation:'лес',      example:'The forest was quiet and smelled of pine.',       folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=60' },
  { id:'wb03', word:'grass',     translation:'трава',    example:'The fresh grass was wet with dew.',               folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1550744662-8c5c8e4f1f3a?auto=format&fit=crop&w=600&q=60' },
  { id:'wb04', word:'lake',      translation:'озеро',    example:'The calm lake reflected the mountains.',          folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1500350214245-e5b58c4f9e7a?auto=format&fit=crop&w=600&q=60' },
  { id:'wb05', word:'leaf',      translation:'лист',     example:'A yellow leaf fell on my book.',                  folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=60' },
  { id:'wb06', word:'mountain',  translation:'гора',     example:'The snowy mountain rose above the clouds.',       folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=60' },
  { id:'wb07', word:'river',     translation:'река',     example:'The river flows slowly to the sea.',              folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=600&q=60' },
  { id:'wb08', word:'rock',      translation:'камень',   example:'The cat liked to sit on the warm rock.',          folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=60' },
  { id:'wb09', word:'sand',      translation:'песок',    example:'The warm sand slipped through my fingers.',       folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=60' },
  { id:'wb10', word:'sea',       translation:'море',     example:'The Black sea is warm in summer.',                folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=600&q=60' },
  { id:'wb11', word:'sky',       translation:'небо',     example:'The evening sky turned orange and pink.',         folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=600&q=60' },
  { id:'wb12', word:'tree',      translation:'дерево',   example:'An old tree stood in the middle of the yard.',    folderId:'f11', imageUrl:'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=600&q=60' },

  // ---- f12: Технологии ----
  { id:'wc01', word:'app',       translation:'приложение', example:'This app helps me learn new words.',             folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=600&q=60' },
  { id:'wc02', word:'computer',  translation:'компьютер', example:'My computer is on the desk near the window.',     folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=60' },
  { id:'wc03', word:'email',     translation:'эл.почта', example:'I sent the homework to the teacher by email.',    folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1596526131083-e8c633c948d0?auto=format&fit=crop&w=600&q=60' },
  { id:'wc04', word:'file',      translation:'файл',     example:'Save the file under a clear name.',                folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1573164713988-8d6e8e0c9f4b?auto=format&fit=crop&w=600&q=60' },
  { id:'wc05', word:'internet',  translation:'интернет', example:'The internet went down during the storm.',         folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1563986768609-522f8f0753e0?auto=format&fit=crop&w=600&q=60' },
  { id:'wc06', word:'keyboard',  translation:'клавиатура',example:'My keyboard is mechanical and very loud.',       folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=60' },
  { id:'wc07', word:'mouse',     translation:'мышь',     example:'The wireless mouse needs new batteries.',         folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=60' },
  { id:'wc08', word:'password',  translation:'пароль',   example:'Use a strong password for your account.',         folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1510511459019-67eaa15b2c3b?auto=format&fit=crop&w=600&q=60' },
  { id:'wc09', word:'phone',     translation:'телефон',  example:'My phone battery lasts the whole day.',            folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=60' },
  { id:'wc10', word:'program',   translation:'программа', example:'This program edits photos quickly.',              folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=60' },
  { id:'wc11', word:'screen',    translation:'экран',    example:'The screen of my laptop is 15 inches.',           folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=60' },
  { id:'wc12', word:'website',   translation:'сайт',     example:'Visit our website for more information.',         folderId:'f12', imageUrl:'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=600&q=60' }
];

// Экспорт в window (без модулей, чтобы работало через обычный <script>)
window.SYSTEM_FOLDERS = SYSTEM_FOLDERS;
window.SYSTEM_WORDS = SYSTEM_WORDS;
