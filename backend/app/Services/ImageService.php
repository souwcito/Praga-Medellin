<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class ImageService
{
    public const MAX_FULL = 2000;
    public const MAX_MEDIUM = 1200;
    public const MAX_THUMB = 400;
    public const QUALITY = 82;

    /**
     * Optimiza una imagen subida: genera 3 variantes WebP (full ≤2000px,
     * medium ≤1200px, thumb ≤400px), elimina EXIF y normaliza formato.
     * Si GD no está disponible (o el formato no es legible por GD, p. ej. HEIC),
     * mueve el archivo original sin cambios y devuelve la misma ruta en las 3.
     *
     * @return array{thumb: string, medium: string, full: string} rutas relativas
     */
    public function optimizar(UploadedFile $archivo): array
    {
        $base = 'producto-' . time() . '-' . uniqid();
        $destino = public_path('images/products');
        if (!is_dir($destino)) {
            mkdir($destino, 0755, true);
        }

        // Sin GD: mover el original tal cual
        if (!function_exists('imagecreatetruecolor')) {
            $nombre = $base . '.' . $archivo->getClientOriginalExtension();
            $archivo->move($destino, $nombre);
            $rel = 'images/products/' . $nombre;

            return ['thumb' => $rel, 'medium' => $rel, 'full' => $rel];
        }

        $imagen = $this->crearImagen($archivo->getRealPath());
        if (!$imagen) {
            $nombre = $base . '.' . $archivo->getClientOriginalExtension();
            $archivo->move($destino, $nombre);
            $rel = 'images/products/' . $nombre;

            return ['thumb' => $rel, 'medium' => $rel, 'full' => $rel];
        }

        $maximos = ['thumb' => self::MAX_THUMB, 'medium' => self::MAX_MEDIUM, 'full' => self::MAX_FULL];
        $sufijos = ['thumb' => '-thumb', 'medium' => '-medium', 'full' => ''];
        $rutas = [];

        foreach ($maximos as $clave => $maximo) {
            $nombre = $base . $sufijos[$clave] . '.webp';
            $this->escalar($imagen, $destino . '/' . $nombre, $maximo);
            $rutas[$clave] = 'images/products/' . $nombre;
        }

        imagedestroy($imagen);

        return $rutas;
    }

    private function crearImagen(string $ruta)
    {
        $info = @getimagesize($ruta);
        if (!$info) {
            return null;
        }

        switch ($info[2]) {
            case IMAGETYPE_JPEG:
                return @imagecreatefromjpeg($ruta);
            case IMAGETYPE_PNG:
                return @imagecreatefrompng($ruta);
            case IMAGETYPE_WEBP:
                return @imagecreatefromwebp($ruta);
            default:
                return null;
        }
    }

    private function escalar($src, string $ruta, int $max): void
    {
        $w = imagesx($src);
        $h = imagesy($src);
        $escala = min(1, $max / max(1, max($w, $h)));
        $nw = max(1, (int) round($w * $escala));
        $nh = max(1, (int) round($h * $escala));

        $dst = imagecreatetruecolor($nw, $nh);
        // Preservar transparencia (PNG con alpha)
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparente = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefill($dst, 0, 0, $transparente);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagealphablending($dst, true);

        imagewebp($dst, $ruta, self::QUALITY);
        imagedestroy($dst);
    }
}