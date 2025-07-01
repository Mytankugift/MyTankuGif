<?php
/*
Plugin Name: Tanku Products Shortcode
Description: Displays Tanku products in a social-network style feed.
Version: 1.0
Author: Tanku Dev Team
*/

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Enqueue plugin stylesheet.
 */
function tanku_products_enqueue_styles() {
    wp_register_style( 'tanku-products-style', plugin_dir_url( __FILE__ ) . 'Styles/index.css', array(), '1.0' );
    wp_enqueue_style( 'tanku-products-style' );
}

/**
 * Shortcode callback – renders product list.
 *
 * @return string HTML markup.
 */
function tanku_products_shortcode() {
    // Ensure CSS is loaded only when shortcode is rendered.
    tanku_products_enqueue_styles();

    $request  = wp_remote_get( 'https://tanku-production.up.railway.app/wordpress/list-products' );

    if ( is_wp_error( $request ) ) {
        return '<p>Error obteniendo los productos.</p>';
    }

    $code = wp_remote_retrieve_response_code( $request );
    if ( 200 !== $code ) {
        return '<p>No se pudieron obtener los productos (código ' . esc_html( $code ) . ').</p>';
    }

    $body     = wp_remote_retrieve_body( $request );
    $products = json_decode( $body, true );

    if ( empty( $products ) || ! is_array( $products ) ) {
        return '<p>No hay productos disponibles.</p>';
    }

    ob_start();
    ?>
    <div class="tanku-products-container">
        <?php foreach ( $products as $product ) :
            // Use first variant for price if available.
            $first_variant = isset( $product['variants'][0] ) ? $product['variants'][0] : null;
            $price         = $first_variant && isset( $first_variant['inventory']['price'] ) ? $first_variant['inventory']['price'] : null;
            $currency      = $first_variant && isset( $first_variant['inventory']['currency_code'] ) ? strtoupper( $first_variant['inventory']['currency_code'] ) : '';
            ?>
            <article class="tanku-product-card">
                <header class="tanku-card-header">
                    <h2 class="tanku-product-title"><?php echo esc_html( $product['title'] ); ?></h2>
                </header>

                <div class="tanku-card-body">
                    <div class="tanku-product-image">
                        <img src="<?php echo esc_url( $product['thumbnail'] ); ?>" alt="<?php echo esc_attr( $product['title'] ); ?>" />
                    </div>
                    <p class="tanku-product-desc">
                        <?php echo esc_html( mb_strimwidth( $product['description'], 0, 180, '…' ) ); ?>
                    </p>
                </div>

                <footer class="tanku-card-footer">
                    <?php if ( $price ) : ?>
                        <span class="tanku-product-price"><?php echo esc_html( number_format_i18n( $price ) . ' ' . $currency ); ?></span>
                    <?php endif; ?>
                </footer>
            </article>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'tanku_products', 'tanku_products_shortcode' );
