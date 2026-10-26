<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Catálogo de códigos (marcas, colores y estilos) para armar el SKU de los
// productos. Se carga desde el panel; este seeder es la carga inicial.
class CatalogoCodigosSeeder extends Seeder
{
    public static function datos(): array
    {
        return [
            'marcas' => [
            ['01', 'BOSS'], ['02', 'Calvin Klein'], ['03', 'Jordan'], ['04', 'Nike'], ['05', 'Coach'],
            ['06', 'Clemont'], ['07', 'Armani Exchange'], ['08', 'Karl Lagerfeld'], ['09', 'Louis Vuitton'], ['10', 'Gucci'],
            ['11', 'Burberry'], ['12', 'Hermes'], ['13', 'Dior'], ['14', 'Guess'], ['15', 'Supreme'],
            ['16', 'Lacoste'], ['17', 'AP Crown'], ['18', 'Creative Recreation'], ['19', 'Infinity Space'], ['20', 'Off White'],
            ['21', 'AMIRI'], ['22', 'Purple'], ['23', 'Y/OUT'], ['24', 'Casa blanca'], ['25', 'Michael Kors'],
            ['26', 'Superdry'], ['27', 'SAINT THEORY'], ['28', 'Prada'], ['29', 'Moncler'], ['30', 'Undergold'],
            ['31', 'AHLI'], ['32', 'ILMIN'], ['33', 'MOSCHINO'], ['34', 'BLACKOUD'], ['35', 'LATTAFA'],
            ['36', 'BHARARA'], ['37', 'Blow up'], ['38', 'Hugo'], ['39', 'Sceptre'], ['40', 'Hawas'],
            ['41', 'ODYSSEY'], ['42', 'Adidas'], ['43', 'Keith Haring'], ['44', 'Puma'], ['45', 'Monastery'],
            ['46', 'Pyscho Bunny'], ['47', 'Balmain'], ['48', 'Balenciaga'], ['49', 'Hellstar'], ['50', 'Chrome hearts'],
            ['51', 'Mercedes Benz'], ['52', 'Tommy Hilfiger'], ['53', 'TECHNOMARINE'], ['54', 'Givenchy'], ['55', 'Bullish Hype'],
            ['56', 'BMW'], ['57', 'Represent'], ['58', 'Jean Paul Gaultier'],
        ],

            'colores' => [
            ['01', 'Azul con negro'], ['02', 'Celeste con azul oscuro'], ['03', 'Verde militar'], ['04', 'Verde militar con negro'], ['05', 'Azul oscuro'],
            ['06', 'Negro'], ['07', 'Celeste'], ['08', 'Azul'], ['09', 'Negro con blanco'], ['10', 'Rojo con negro'],
            ['11', 'Blanco con negro'], ['12', 'Morado'], ['13', 'Café claro con negro'], ['14', 'Beige'], ['15', 'Dorado'],
            ['16', 'Gris'], ['17', 'Agua marina'], ['18', 'Blanco con celeste'], ['19', 'Café'], ['20', 'Blanco con azul'],
            ['21', 'Blanco'], ['22', 'Blanco con beige'], ['23', 'Turquesa con amarillo'], ['24', 'Blanco con dorado'], ['25', 'Morado con azul'],
            ['26', 'Rojo'], ['27', 'Blanco hueso'], ['28', 'Beige con negro'], ['29', 'Negro con gris'], ['30', 'Azul con negro'],
            ['31', 'Negro con beige'], ['32', 'Dorado con azul'], ['33', 'Gris con negro'], ['34', 'Transparente'], ['35', 'Verde claro'],
            ['36', 'Crema'], ['37', 'Café claro'], ['38', 'Café oscuro'], ['39', 'Café con blanco'], ['40', 'Blanco con rojo'],
            ['41', 'Negro con rojo'], ['42', 'Verde limón'], ['43', 'Negro con amarillo'], ['44', 'Blanco con gris'], ['45', 'Mostaza'],
            ['46', 'Negro con rojo'], ['47', 'Gris ratón'], ['48', 'Negro con dorado'], ['49', 'Rojo con blanco'], ['50', 'Verde con blanco'],
        ],

            'estilos' => [
            'GOR' => [
                ['01', 'Gorra BOSS clásica'], ['02', 'Gorra BOSS bordada'], ['03', 'Gorra CK Clásica'], ['04', 'Gorra CK Homonograma'], ['05', 'Gorra Jordan muñeco (color)'],
                ['06', 'Gorra Jordan World wide'], ['07', 'Gorra Nike clásica'], ['08', 'Gorra Nike reflectiva'], ['09', 'Gorra Coach clásica'], ['10', 'Gorra Clemont Amicizia'],
                ['11', 'Gorra Clemont Obbligo'], ['12', 'Gorra Clemont INNO'], ['13', 'Gorra Clemont Lerici'], ['14', 'Gorra Clemont Oblitare'], ['15', 'Gorra AX 3D'],
                ['16', 'Gorra Karl Lagerfeld clásica'], ['17', 'Gorra Louis Vuitton clásica'], ['18', 'Gorra Gucci clásica'], ['19', 'Gorra Gucci bandera'], ['20', 'Gorra Gucci Homonograma'],
                ['21', 'Gorra Gucci serpiente'], ['22', 'Gorra Burberry caballo'], ['23', 'Gorra Louis Vuitton Homonograma'], ['24', 'Gorra Gucci peluche'], ['25', 'Gorra Gucci malla'],
                ['26', 'Gorra Hermes cuero'], ['27', 'Gorra Dior Homonograma'], ['28', 'Gorra Jordan Golf'], ['29', 'Gorra Jordan 6x champ'], ['30', 'Gorra Guess Homonograma'],
                ['31', 'Gorra Jordan rayitos'], ['32', 'Gorra CK Homonograma'], ['33', 'Gorra Supreme demonio'], ['34', 'Gorra Jordan Air'], ['35', 'Gorra Lacoste clásica'],
                ['36', 'Gorra AP Crown clásica'], ['37', 'Gorra Guess Homonograma bandera'], ['38', 'Gorra Recreative clásica'], ['39', 'Gorra Infinity Space misión'], ['40', 'Gorra Infinity Space constelaciones'],
                ['41', 'Gorra Infinity Space stickers'], ['42', 'Gorra Infinity Space cohete peluche'], ['43', 'Gorra Infinity Space letra pegada'], ['44', 'Gorra Infinity Space doble'], ['45', 'Gorra Infinity Space grafiti'],
                ['46', 'Gorra Infinity Space parches'], ['47', 'Gorra Infinity Space'], ['48', 'Gorra BOSS Porsche'], ['49', 'Gorra Calvin Klein teja blanca'], ['50', 'Gorra Guess tigre'],
                ['51', 'Gorra Guess Los Angeles'], ['52', 'Gorra Burberry clásica'], ['53', 'Gorra Guess Holograma'], ['54', 'Gorra Clemont Covered with angels'], ['55', 'Gorra Clemont Tra le stelle'],
                ['56', 'Gorra Clemont PREGEVOLE'], ['57', 'Gorra Coach 1.1'], ['58', 'Gorra Clemont Pinchos 1.1'], ['59', 'Gorra Clemont básica 1.1'], ['60', 'Gorra Clemont clásica 1.1'],
                ['61', 'Gorra Clemont Angel 1.1'], ['62', 'Gorra Clemont Rosa 1.1'], ['63', 'Gorra Blow up básica 1.1'], ['64', 'Gorra Clemont Firma 1.1'], ['65', 'Gorra Worldwide 1.1'],
                ['95', 'Gorra Nube 1.1'],
                ['66', 'Gorra Blow Up granada 1.1 Premium'], ['67', 'Gorra Clemont rama 1.1'], ['68', 'Gorra Y/OUT comillas 1.1 Premium'], ['69', 'Gorra Y/OUT avión 1.1 Premium'], ['70', 'Gorra Y/OUT firma 1.1 Premium'],
                ['71', 'Gorra Y/OUT líneas 1.1 Premium'], ['72', 'Gorra Y/OUT vaca 1.1 Premium'], ['73', 'Gorra Nike llamas 1.1 Premium'], ['74', 'Gorra AP CROWN ojos 1.1 Premium'], ['75', 'Gorra Jordan negra muñeco blanco 1.1 premium'],
                ['76', 'Gorra Jordan letras blanca con negro'], ['77', 'Gorra Michael Kors clásica original'], ['78', 'Gorra Clemont OMBROSO original'], ['79', 'Gorra Clemont ESUBERANZA original'], ['80', 'Gorra Adidas básica original'],
                ['81', 'Gorra Adidas clásica original'], ['82', 'Gorra Clemont PLENITUDE original'], ['83', 'Gorra Armani Exchange clásica original'], ['84', 'Gorra Coach 1941 original'], ['85', 'Gorra Hugo clásica original'],
                ['86', 'Gorra Clemont Saint 1.1 Premium'], ['87', 'Gorra Clemont Obbligo 1.1 Premium'], ['88', 'Gorra Clemont C 1.1 Premium'], ['89', 'Gorra Monastery básica 1.1 Premium'], ['90', 'Gorra Creative Recreation clásica 1.1 Premium'],
                ['91', 'Gorra Bullish Hype básica 1.1 Premium'], ['92', 'Gorra Moschino clásica 1.1 Premium'], ['93', 'Gorra BOSS sencilla 1.1 Premium'], ['94', 'Gorra Y/OUT clásica 1.1 premium'],
            ],
            'BOL' => [
                ['01', 'Bolso Burberry clásico'], ['02', 'Bolso Dior clásico'], ['03', 'Bolso Gucci clásico'], ['04', 'Bolso Jordan tapa'], ['05', 'Bolso Jordan cierre'],
                ['06', 'Bolso Guess clásico'], ['07', 'Bolso Michael Kors tapa'],
            ],
            'ZAP' => [
                ['01', 'Zapatos Louis Vuitton Trainer cocodrilo 7 USA'], ['02', 'Zapatos Louis Vuitton Trainer 10 USA'], ['03', 'Zapatos Louis Vuitton Skate Sneaker 10 USA'], ['04', 'Zapatos Louis Vuitton Skate Sneaker flor monograma 8 USA'], ['05', 'Zapatos Off White Be Right back 8 USA - 7 USA'],
                ['06', 'Zapatos Off-White Out Of Office'], ['07', 'Zapatos Work In Progress'], ['08', 'Zapatos Gucci Ace GG'], ['09', 'Zapatos Gucci Mac8 Sneaker'], ['10', 'Zapatos Gucci Mac8 Low-Top'],
                ['11', 'Zapatos Gucci Cub3d Sneaker'], ['12', 'Zapatos Nike Dn8'], ['13', 'Zapatos Nike AF1 x Supreme'], ['14', 'Zapatos CK Retro Basketball'], ['15', 'Zapatos CK holograma original'],
                ['16', 'Zapatos CK Cayle original'], ['17', 'Zapatos Guess Tryon'], ['18', 'Tenis Louis Vuitton LV Skate Sneaker'], ['19', 'Tenis BOSS clásicos 1.1 Premium'], ['20', 'Tenis Calvin Klein Gules2'],
                ['21', 'Tenis Clemont clásicos 1.1 Premium'], ['22', 'Tenis Coach clásicos 1.1 Premium'], ['23', 'Tenis Tommy Hilfiger clásicos 1.1 Premium'], ['24', 'Tenis Hugo firma 1.1 Premium'], ['25', 'Tenis BOSS clásicos 1.1 Premium'],
            ],
            'CHA' => [
                ['01', 'Chanclas Louis Vuitton clásicas'], ['02', 'Chanclas Burberry clásicas'], ['03', 'Chanclas AMIRI clásicas'], ['04', 'Chanclas Jordan with love'], ['05', 'Chanclas CK clásicas'],
                ['06', 'Chanclas Karl Lagerfeld clásicas'], ['07', 'Chanclas Guess clásicas'], ['08', 'Chanclas Karl Lagerfeld París'], ['09', 'Chanclas Y/OUT clásicas 1.1 premium'],
            ],
            'CAM' => [
                ['01', 'Camisa Y/OUT desgaste'], ['02', 'Camisa Clemont flor empiedrada'], ['03', 'Camisa Clemont negra blanca'], ['04', 'Camisa Off White colores'], ['05', 'Camisa Clemont INTAGLIO'],
                ['06', 'Camisa Clemont SINTESI'], ['07', 'Camisa Clemont EUFORIA'], ['08', 'Camisa Clemont PAURA'], ['09', 'Camisa Clemont ETEREO'], ['10', 'Camisa Clemont ESTREMO'],
                ['11', 'Camisa Y/OUT LLAMA'], ['12', 'Camisa Off white Angel'], ['13', 'Camisa Casa blanca Olimpo'], ['14', 'Camisa Casa blanca LA'], ['15', 'Camisa AMIRI Ángel'],
                ['16', 'Camisa AMIRI Jazz'], ['17', 'Camisa Guess triángulo'], ['18', 'Camisa Guess clásica'], ['19', 'Camisa Guess GG'], ['20', 'Camisa Guess tigre'],
                ['21', 'Camisa Guess diamante'], ['22', 'Camisa Guess triángulo V2'], ['23', 'Camisa Off white Virgil'], ['24', 'Camisa Guess moneda'], ['25', 'Camisa Guess grafiti'],
                ['26', 'Camisa Guess estampada'], ['27', 'Camisa CK clásica'], ['28', 'Camisa CK firma'], ['29', 'Camisa CK básica'], ['30', 'Camisa CK estampada'],
                ['31', 'Camisa CK manchas'], ['32', 'Camisa Lacoste cocodrilo gris'], ['33', 'Camisa Lacoste cuadros'], ['34', 'Camisa Lacoste estampada'], ['35', 'Camisa Lacoste básica'],
                ['36', 'Camisa Lacoste clásica'], ['37', 'Camisa Lacoste regular fit'], ['38', 'Camisa Nike grafiti'], ['39', 'Camisa Nike básica'], ['40', 'Camisa Nike cursiva'],
                ['41', 'Camisa Nike Angel'], ['42', 'Camisa AP CROWN velvet'], ['43', 'Camisa SUPREME evolución'], ['44', 'Camisa SUPREME básica'], ['45', 'Camisa AX básica'],
                ['46', 'Camisa MK estampada'], ['47', 'Camisa Infinity Space ojos'], ['48', 'Camisa Infinity Space Básica'], ['49', 'Camisa Infinity Space clásica'], ['50', 'Camisa Infinity Space galaxia'],
                ['51', 'Camisa Infinity Space constelaciones'], ['52', 'Camisa Infinity Space formula'], ['53', 'Camisa Gucci clásica'], ['54', 'Camiseta Casa Blanca Lowrider'], ['55', 'Camiseta BOSS edificio'],
                ['56', 'Camiseta Jordan básica'], ['57', 'Camiseta Hugo pelícano'], ['58', 'Camiseta Lacoste All Around'], ['59', 'Camiseta Nike nubes 1.1 Premium'], ['60', 'Camiseta BOSS brillo 1.1 Premium'],
                ['61', 'Camiseta BOSS Grafiti 1.1 premium'], ['62', 'Camiseta Hugo clásica 1.1 Premium'], ['63', 'Camiseta Lacoste estampa trasera 1.1 Premium'], ['64', 'Camiseta Hugo astronauta 1.1 Premium'], ['65', 'Camiseta Clemont Cuel Lobe 1.1 Premium'],
                ['66', 'Camiseta Jordan Billete 1.1 Premium'], ['67', 'Camiseta Hugo sencilla'], ['68', 'Camiseta Calvin Klein tipografías 1.1 Premium'], ['69', 'Camiseta Clemont cielo 1.1 premium'], ['70', 'Camiseta Clemont Malevolence 1.1 Premium'],
                ['71', 'Camiseta Clemont Mental Armour 1.1 Premium'], ['72', 'Camiseta Calvin Klein Holograma 1.1 premium'], ['73', 'Camiseta Clemont monalisa 1.1 Premium'], ['74', 'Camiseta Clemont olimpo 1.1 premium'], ['75', 'Camiseta Psycho Bunny Clásica 1.1 Premium'],
                ['76', 'Camiseta Blow Up básica 1.1 premium'], ['77', 'Camiseta Karl Lagerfeld Grafiti 1.1 premium'], ['78', 'Camiseta Karl Lagerfeld código de barras 1.1 premium'], ['79', 'Camiseta Clemont león 1.1 Premium'], ['80', 'Camiseta Undergold palomas 1.1 Premium'],
                ['81', 'Camiseta Balmain Clásica 1.1 Premium'], ['82', 'Camiseta Nike baloncesto 1.1 Premium'], ['83', 'Camiseta Balenciaga Básica 1.1 Premium'], ['84', 'Camiseta Blow up mundo 1.1 Premium'], ['85', 'Camiseta Clemont espejo 1.1 Premium'],
                ['86', 'Camiseta AMIRI básica 1.1 Premium'], ['87', 'Camiseta Clemont monumento 1.1 Premium'], ['88', 'Camiseta Nike Engineered 1.1 Premium'], ['89', 'Camiseta Clemont Nube 1.1 Premium'], ['90', 'Camiseta Jordan AIR 1.1 Premium'],
                ['91', 'Camiseta Monastery básica 1.1 Premium'], ['92', 'Camiseta Coach Básica 1.1 Premium'], ['93', 'Camiseta Clemont ojo 1.1 Premium'], ['94', 'Camiseta Undergold ángeles 1.1 Premium'], ['95', 'Camiseta AMIRI león 1.1 Premium'],
                ['96', 'Camiseta Clemont umbral de los sueños 1.1 Premium'], ['97', 'Camiseta Clemont básica 1.1 Premium'], ['98', 'Camiseta Undergold sol 1.1 Premium'], ['99', 'Camiseta Clemont firma 1.1 Premium'], ['100', 'Camiseta Clemont placeri 1.1 Premium'],
                ['101', 'Camiseta Clemont sencilla 1.1 Premium'], ['102', 'Camiseta Big Lacoste 1.1 Premium'], ['103', 'Camiseta Lacoste tennis club 1.1 Premium'], ['104', 'Camiseta Hellstar básica 1.1 Premium'], ['105', 'Camiseta Louis Vuitton Básica 1.1 Premium'],
                ['106', 'Camiseta Hugo carro 1.1 Premium'], ['107', 'Camiseta Calvin Klein Street New York 1.1 Premium'], ['108', 'Camiseta Supreme básica 1.1 Premium'], ['109', 'Camiseta Guess GG holograma 1.1 Premium'], ['110', 'Camiseta Hugo cuadro 1.1 Premium'],
                ['111', 'Camiseta Givenchy básica'], ['112', 'Camiseta Hugo perro 1.1 Premium'], ['113', 'Camiseta Calvin Klein cubica 1.1 Premium'], ['114', 'Camiseta Prada básica 1.1 Premium'], ['115', 'Camiseta Represent dóberman 1.1 Premium'],
            ],
            'BUZ' => [
                ['01', 'Buzo Superdry clásico'], ['02', 'Buzo BOSS difuminado'], ['03', 'Buzo BOSS clásico'], ['04', 'Buzo AX estampado'], ['05', 'Buzo Nike estampado'],
                ['06', 'Buzo Nike Tech'], ['07', 'Buzo CK clásico'], ['08', 'Buzo AP CROWN clásico'], ['09', 'Buzo Lacoste raqueta'], ['10', 'Buzo Lacoste clásico'],
                ['11', 'Buzo SUPREME clásico'], ['12', 'Buzo Jordan clásico'], ['13', 'Buzo Guess clásico'], ['14', 'Buzo Creative clásico'], ['15', 'Buzo SAINT THEORY alas'],
                ['16', 'Buzo SAINT THEORY DIVINE THREADS'], ['17', 'Buzo Gucci clásico'], ['18', 'Buzo Prada clásico'], ['19', 'Buzo BOSS sencillo 1.1 Premium'], ['20', 'Buzo Coach dinosaurio 1.1 Premium'],
                ['21', 'Buzo Chrome hearts básica 1.1 Premium'], ['22', 'Buzo Mercedes Benz básico'], ['23', 'Buzo Keith Haring x Lacoste 1.1 Premium'], ['24', 'Buzo Clemont basico 1.1 premium'], ['25', 'Buzo Calvin Klein sencillo 1.1 premium'],
                ['26', 'Buzo Nike basico 1.1 premium'], ['27', 'Buzo Superdry Básico'], ['28', 'Buzo BOSS sencillo 1.1 Premium'], ['29', 'Buzo AP CROWN básico 1.1 Premium'], ['30', 'Camibuzo Hugo clásico 1.1 Premium'],
                ['31', 'Buzo BOSS clásico franja 1.1 Premium'], ['32', 'Buzo Nike chulos estampados 1.1 Premium'], ['33', 'Buzo Nike estampa frontal 1.1 Premium'], ['34', 'Buzo Armani Exchange estampado 1.1 Premium'], ['35', 'Buzo Nike sencillo 1.1 Premium'],
            ],
            'CON' => [
                ['01', 'Conjunto Gucci Grafiti'], ['02', 'Conjunto Gucci holograma'], ['03', 'Conjunto Gucci holograma único color'], ['04', 'Conjunto Louis Vuitton clásico'], ['05', 'Conjunto Dior básico'],
                ['06', 'Conjunto Dior clásico'], ['07', 'Conjunto Burberry clásico'], ['08', 'Conjunto Moncler básico'], ['09', 'Conjunto Nike tech'], ['10', 'Conjunto Gucci clásico'],
                ['11', 'Conjunto Adidas Y-3 1.1 Premium'], ['12', 'Conjunto BOSS sencillo 1.1 Premium'], ['13', 'Conjunto Clemont clásico 1.1 Premium'], ['14', 'Conjunto Nike sencillo 1.1 Premium'], ['15', 'Conjunto Keith Haring sencillo 1.1 Premium'],
                ['16', 'Conjunto Nike básico (el del chulo en la mitad) 1.1 Premium'], ['17', 'Conjunto Nike normal (con literal NIKE al frente) 1.1 Premium'], ['18', 'Conjunto Undergold 111 1.1 Premium'], ['19', 'Conjunto Nike chulo vacio 1.1 Premium'], ['20', 'Conjunto Louis Vuitton mareque sudadera y camiseta 1.1 Premium'],
                ['21', 'Conjunto AMIRI básico sudadera y camiseta 1.1 Premium'], ['22', 'Conjunto Coach básico sudadera y camiseta 1.1 Premium'], ['23', 'Conjunto Monastery clásico sudadera y camiseta 1.1 Premium'], ['24', 'Conjunto Clemont sencillo pantaloneta y camiseta 1.1 Premium'], ['25', 'Conjunto Y/OUT sencillo pantaloneta y camiseta 1.1 Premium'],
            ],
            'SUD' => [
                ['01', 'Sudadera Nike cargo'], ['02', 'Sudadera Nike clásica'], ['03', 'Sudadera BOSS difuminada'], ['04', 'Sudadera BOSS básica'], ['05', 'Sudadera Armani Exchange básica'],
                ['06', 'Sudadera CK holograma'], ['07', 'Sudadera CK básica'], ['08', 'Sudadera AP CROWN BÁSICA'], ['09', 'Sudadera Undergold básica'], ['10', 'Sudadera BOSS goma'],
                ['11', 'Sudadera Blow up básica'], ['12', 'Sudadera Nike Nocta'], ['13', 'Sudadera Hugo firma'], ['14', 'Sudadera Keit Haring clásica'], ['15', 'Sudadera Boss corazón'],
                ['16', 'Sudadera Boss franja'], ['17', 'Sudadera Coach cierre'], ['18', 'Sudadera Coach clásica'], ['19', 'Sudadera Puma Clásica'], ['20', 'Sudadera Adidas clásica'],
                ['21', 'Sudadera Adidas geométrica'], ['22', 'Sudadera Boss bota'], ['23', 'Sudadera Armani Exchange sencilla 1.1 Premium'], ['24', 'Sudadera Hugo firma 1.1 Premium'], ['25', 'Sudadera BOSS sencilla 1.1 Premium'],
                ['26', 'Sudadera Nike tech 1.1 Premium'], ['27', 'Sudadera Monastery clásica 1.1 Premium'],
            ],
            'REL' => [
                ['01', 'TECHNOMARINE circular dorado fondo dorado'], ['02', 'TECHNOMARINE dorado hexagonal fondo blanco'], ['03', 'TECHNOMARINE circular dorado fondo negro'], ['04', 'TECHNOMARINE circular plateado con blanco fondo negro'], ['05', 'TECHNOMARINE circular plateado fondo negro'],
                ['06', 'TECHNOMARINE hexagonal plateado fondo blanco'], ['07', 'TECHNOMARINE hexagonal plateado fondo celeste'], ['08', 'TECHNOMARINE hexagonal dorado fondo negro'], ['09', 'TECHNOMARINE circular dorado fondo blanco'], ['10', 'TECHNOMARINE hexagonal plateado fondo negro'],
                ['11', 'TECHNOMARINE circular oro rosa fondo oro rosa'], ['12', 'TECHNOMARINE circular oro rosa con negro fondo negro'], ['13', 'TECHNOMARINE circular plateado fondo blanco'], ['14', 'TECHNOMARINE circular plateado con azul fondo azul'], ['15', 'Guess cuadrado transparente fondo blanco'],
            ],
            'PER' => [
                ['01', 'AHLI CANES'], ['02', 'ILMIN IL OOMPH'], ['03', 'Moschino Toy Boy'], ['04', 'Lattafa Asad negra'], ['05', 'Bharara king'],
                ['06', 'BLACKOUD By Drew'], ['07', 'ODYSSEY Go Mango 1.1 Premium'], ['08', 'Hugo Boss Unlimited 1.1 Premium'], ['09', 'Hawas Ice 1.1 Premium'], ['10', 'Lattafa Fakhar 1.1 Premium'],
                ['11', 'Sceptre Malachite 1.1 Premium'], ['12', 'Jean Paul Gaultier Le Male Elixir'],
            ],
            'PAN' => [
                ['01', 'Pantaloneta Y/OUT clásica'],
            ],
        ],
        ];
    }

    public function run(): void
    {
        $datos = self::datos();

        foreach ($datos['marcas'] as [$codigo, $nombre]) {
            DB::table('marcas')->updateOrInsert(['catalogo' => 'hombre', 'codigo' => $codigo], ['nombre' => $nombre, 'updated_at' => now(), 'created_at' => now()]);
        }
        foreach ($datos['colores'] as [$codigo, $nombre]) {
            DB::table('colores')->updateOrInsert(['catalogo' => 'hombre', 'codigo' => $codigo], ['nombre' => $nombre, 'updated_at' => now(), 'created_at' => now()]);
        }
        foreach ($datos['estilos'] as $prenda => $lista) {
            foreach ($lista as [$codigo, $nombre]) {
                DB::table('estilos')->updateOrInsert(
                    ['catalogo' => 'hombre', 'prenda' => $prenda, 'codigo' => $codigo],
                    ['nombre' => $nombre, 'updated_at' => now(), 'created_at' => now()],
                );
            }
        }
    }
}
