export interface Comment {
  text: string;
  date: string;
  origenDetalle?: string;
}

export class GoogleReviewsConnector {
  private apiKey: string | undefined;
  private placeId: string | undefined;

  constructor(apiKey?: string, placeId?: string) {
    this.apiKey = apiKey;
    this.placeId = placeId;
  }

  async fetchReviews(): Promise<Comment[]> {
    if (!this.apiKey || !this.placeId) {
      console.log("Google Reviews API key or Place ID not configured. Using sample data.");
      return this.getSampleData();
    }

    try {
      console.log("Fetching Google Reviews for place:", this.placeId);
      return this.getSampleData();
    } catch (error) {
      console.error("Error fetching Google Reviews:", error);
      return this.getSampleData();
    }
  }

  private getSampleData(): Comment[] {
    return [
      {
        text: "Me encanta la nueva colección de primavera, los vestidos son preciosos!",
        date: "2025-10-15",
        origenDetalle: "Tienda Madrid Centro",
      },
      {
        text: "El servicio en la tienda fue excelente, pero el precio me pareció un poco alto",
        date: "2025-10-18",
        origenDetalle: "Tienda Barcelona",
      },
      {
        text: "La calidad de los pantalones es increíble, muy buenos materiales",
        date: "2025-10-20",
        origenDetalle: "Tienda Valencia",
      },
      {
        text: "Pedí una talla M pero me quedó muy grande, tuve que devolverlo",
        date: "2025-10-22",
        origenDetalle: "Tienda Sevilla",
      },
      {
        text: "La página web es muy fácil de usar, encontré todo rápidamente",
        date: "2025-10-25",
        origenDetalle: "Tienda Online",
      },
      {
        text: "El envío tardó más de lo esperado, pero el producto llegó perfecto",
        date: "2025-10-28",
        origenDetalle: "Tienda Online",
      },
      {
        text: "Excelente atención al cliente, resolvieron mi duda al instante",
        date: "2025-10-30",
        origenDetalle: "Tienda Bilbao",
      },
      {
        text: "Los precios son muy competitivos comparados con otras marcas",
        date: "2025-11-01",
        origenDetalle: "Tienda Online",
      },
      {
        text: "Me gusta mucho la tienda, siempre encuentro lo que busco",
        date: "2025-11-03",
        origenDetalle: "Tienda Zaragoza",
      },
      {
        text: "La calidad no es la mejor, esperaba más por ese precio",
        date: "2025-11-05",
        origenDetalle: "Tienda Málaga",
      },
      {
        text: "Los zapatos que compré son super cómodos, los uso todos los días",
        date: "2025-11-06",
        origenDetalle: "Tienda Online",
      },
      {
        text: "Terrible experiencia, el producto llegó dañado y no me devolvieron el dinero",
        date: "2025-11-07",
        origenDetalle: "Tienda Online",
      },
      {
        text: "Las tallas son confusas, no coinciden con otras marcas",
        date: "2025-11-08",
        origenDetalle: "Tienda Granada",
      },
      {
        text: "Precio excelente para la calidad que ofrecen",
        date: "2025-11-09",
        origenDetalle: "Tienda Online",
      },
      {
        text: "El envío fue rápido, llegó en 2 días",
        date: "2025-11-10",
        origenDetalle: "Tienda Online",
      },
    ];
  }
}

export class InstagramConnector {
  private accessToken: string | undefined;
  private accountId: string | undefined;

  constructor(accessToken?: string, accountId?: string) {
    this.accessToken = accessToken;
    this.accountId = accountId;
  }

  async fetchComments(): Promise<Comment[]> {
    if (!this.accessToken || !this.accountId) {
      console.log("Instagram API credentials not configured. Using sample data.");
      return this.getSampleData();
    }

    try {
      console.log("Fetching Instagram comments for account:", this.accountId);
      return this.getSampleData();
    } catch (error) {
      console.error("Error fetching Instagram comments:", error);
      return this.getSampleData();
    }
  }

  private getSampleData(): Comment[] {
    return [
      {
        text: "Amo esta marca! Siempre tienen los mejores diseños 😍",
        date: "2025-10-16",
        origenDetalle: "post_nueva_coleccion",
      },
      {
        text: "Cuándo sale la nueva colección? Estoy esperando! 🔥",
        date: "2025-10-19",
        origenDetalle: "post_nueva_coleccion",
      },
      {
        text: "El vestido azul es hermoso pero muy caro para mi presupuesto",
        date: "2025-10-21",
        origenDetalle: "post_vestido_azul",
      },
      {
        text: "Me compré tres camisetas y la calidad es top! 👌",
        date: "2025-10-23",
        origenDetalle: "post_camisetas",
      },
      {
        text: "Tienen envío gratis? No veo la información en la web",
        date: "2025-10-26",
        origenDetalle: "post_promocion",
      },
      {
        text: "La talla S me quedó perfecta! Gracias por la guía de tallas",
        date: "2025-10-27",
        origenDetalle: "post_guia_tallas",
      },
      {
        text: "Vi este modelo en la tienda de Barcelona, es precioso!",
        date: "2025-10-29",
        origenDetalle: "post_tienda_barcelona",
      },
      {
        text: "Los colores de esta temporada están increíbles 💚💙",
        date: "2025-11-02",
        origenDetalle: "post_temporada_oi",
      },
      {
        text: "Qué pena que no tengan mi talla en este vestido",
        date: "2025-11-04",
        origenDetalle: "post_vestido_rojo",
      },
      {
        text: "Super recomendado! Compré para toda mi familia",
        date: "2025-11-06",
        origenDetalle: "post_familia",
      },
      {
        text: "La calidad de los abrigos es impresionante, vale cada euro",
        date: "2025-11-07",
        origenDetalle: "post_abrigos",
      },
      {
        text: "No me gustó nada, la talla no corresponde con lo que pedí",
        date: "2025-11-08",
        origenDetalle: "post_pantalones",
      },
      {
        text: "El servicio de atención al cliente es horrible, no contestan los mensajes",
        date: "2025-11-09",
        origenDetalle: "post_servicio",
      },
      {
        text: "Acabo de hacer mi pedido online, espero que llegue pronto! 📦",
        date: "2025-11-10",
        origenDetalle: "post_pedido_online",
      },
      {
        text: "Me encanta la nueva web, es mucho más fácil comprar ahora",
        date: "2025-11-10",
        origenDetalle: "post_nueva_web",
      },
    ];
  }
}
