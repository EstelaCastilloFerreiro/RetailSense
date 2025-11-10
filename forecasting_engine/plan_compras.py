"""
Plan de Compras (Purchase Plan) Module
Aggregates SKU-level predictions to section-level business metrics
"""

import pandas as pd
import numpy as np
from typing import Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def build_plan_compras(df_pred: pd.DataFrame, 
                       num_tiendas: int = 10,
                       markdown_defaults: Dict[str, float] = None,
                       sobrante_defaults: Dict[str, float] = None) -> pd.DataFrame:
    """
    Build aggregated "Plan de Compras" table by SECCION
    
    Args:
        df_pred: DataFrame with SKU-level predictions (must have SECCION, Cantidad_Predicha, Precio Coste, P.V.P., Talla)
        num_tiendas: Number of stores for x tienda calculation
        markdown_defaults: Dict mapping SECCION to markdown % (default 15%)
        sobrante_defaults: Dict mapping SECCION to sobrante % (default 8%)
        
    Returns:
        DataFrame with Plan de Compras aggregated by SECCION
    """
    logger.info("\n=== Building Plan de Compras ===")
    logger.info(f"Input: {len(df_pred)} SKUs")
    
    # Set defaults
    if markdown_defaults is None:
        markdown_defaults = {}
    if sobrante_defaults is None:
        sobrante_defaults = {}
    
    # Check required columns
    required_cols = ['SECCION', 'Cantidad_Predicha', 'Precio Coste', 'P.V.P.']
    missing_cols = [col for col in required_cols if col not in df_pred.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")
    
    # Ensure numeric types
    df_pred['Cantidad_Predicha'] = pd.to_numeric(df_pred['Cantidad_Predicha'], errors='coerce').fillna(0)
    df_pred['Precio Coste'] = pd.to_numeric(df_pred['Precio Coste'], errors='coerce').fillna(0)
    df_pred['P.V.P.'] = pd.to_numeric(df_pred['P.V.P.'], errors='coerce').fillna(0)
    
    # Group by SECCION
    plan = []
    
    for seccion, group in df_pred.groupby('SECCION'):
        # Basic aggregations
        uds = group['Cantidad_Predicha'].sum()
        pvp_total = (group['Cantidad_Predicha'] * group['P.V.P.']).sum()
        coste_total = (group['Cantidad_Predicha'] * group['Precio Coste']).sum()
        
        # Number of options (distinct products)
        if 'Artículo' in group.columns:
            opc = group['Artículo'].nunique()
        else:
            opc = len(group)
        
        # Average prices
        pm_cte = coste_total / uds if uds > 0 else 0
        pm_vta = pvp_total / uds if uds > 0 else 0
        
        # Margin/Markup
        mk = ((pvp_total - coste_total) / coste_total * 100) if coste_total > 0 else 0
        
        # Depth
        prof = uds / opc if opc > 0 else 0
        
        # Markdown and Sobrante (configurable defaults)
        markdown = markdown_defaults.get(seccion, 15.0)
        sobrante = sobrante_defaults.get(seccion, 8.0)
        
        # x tienda
        x_tienda = uds / num_tiendas if num_tiendas > 0 else 0
        
        # x talla (number of distinct sizes)
        if 'Talla' in group.columns:
            num_tallas = group['Talla'].nunique()
            x_talla = uds / num_tallas if num_tallas > 0 else 0
        else:
            x_talla = 0
        
        plan.append({
            'SECCION': seccion,
            'UDS': int(uds),
            'PVP': round(pvp_total, 2),
            'COSTE': round(coste_total, 2),
            'Opc': int(opc),
            'PM Cte': round(pm_cte, 2),
            'PM Vta': round(pm_vta, 2),
            'Mk': round(mk, 1),
            'Prof': round(prof, 1),
            'MARKDOWN': round(markdown, 1),
            'SOBRANTE': round(sobrante, 1),
            'x tienda': round(x_tienda, 1),
            'x talla': round(x_talla, 1)
        })
    
    plan_df = pd.DataFrame(plan)
    
    # Calculate % seccion and CONTRI
    total_pvp = plan_df['PVP'].sum()
    total_coste = plan_df['COSTE'].sum()
    
    plan_df['% seccion'] = (plan_df['PVP'] / total_pvp * 100) if total_pvp > 0 else 0
    plan_df['CONTRI.'] = (plan_df['COSTE'] / total_coste * 100) if total_coste > 0 else 0
    
    # Round percentages
    plan_df['% seccion'] = plan_df['% seccion'].round(1)
    plan_df['CONTRI.'] = plan_df['CONTRI.'].round(1)
    
    # Reorder columns to match business table
    column_order = [
        'SECCION', '% seccion', 'CONTRI.', 'UDS', 'PVP', 'COSTE',
        'Prof', 'Opc', 'PM Cte', 'PM Vta', 'Mk', 'MARKDOWN', 'SOBRANTE',
        'x tienda', 'x talla'
    ]
    
    plan_df = plan_df[column_order]
    
    # Sort by PVP descending
    plan_df = plan_df.sort_values('PVP', ascending=False).reset_index(drop=True)
    
    logger.info(f"Plan de Compras created: {len(plan_df)} sections")
    logger.info(f"Total UDS: {plan_df['UDS'].sum():,.0f}")
    logger.info(f"Total PVP: €{plan_df['PVP'].sum():,.2f}")
    logger.info(f"Total COSTE: €{plan_df['COSTE'].sum():,.2f}")
    logger.info(f"Average Mk: {plan_df['Mk'].mean():.1f}%")
    
    return plan_df


def format_plan_compras_for_export(plan_df: pd.DataFrame) -> pd.DataFrame:
    """
    Format Plan de Compras for Excel export with proper formatting
    
    Args:
        plan_df: Plan de Compras DataFrame
        
    Returns:
        Formatted DataFrame ready for export
    """
    df_export = plan_df.copy()
    
    # Format currency columns
    currency_cols = ['PVP', 'COSTE', 'PM Cte', 'PM Vta']
    for col in currency_cols:
        df_export[col] = df_export[col].apply(lambda x: f"€{x:,.2f}")
    
    # Format percentage columns
    pct_cols = ['% seccion', 'CONTRI.', 'Mk', 'MARKDOWN', 'SOBRANTE']
    for col in pct_cols:
        df_export[col] = df_export[col].apply(lambda x: f"{x:.1f}%")
    
    # Format decimal columns
    decimal_cols = ['Prof', 'x tienda', 'x talla']
    for col in decimal_cols:
        df_export[col] = df_export[col].apply(lambda x: f"{x:.1f}")
    
    return df_export
