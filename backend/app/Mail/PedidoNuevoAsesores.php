<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoNuevoAsesores extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nuevo pedido pagado ' . $this->pedido->numero . ' — Praga Medellín',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mails.asesores',
            with: [
                'pedido' => $this->pedido,
                'cliente' => $this->pedido->cliente,
            ],
        );
    }
}